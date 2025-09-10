using HrPortal.Api.Contracts;
using HrPortal.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HrPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttendanceController : ControllerBase
{
    private readonly HrPortalDbContext _db;
    public AttendanceController(HrPortalDbContext db) => _db = db;

    // Step 3 body for clock-out
    public record ClockOutRequest(Guid? TaskId);

    private static DateTime UtcToday() => DateTime.UtcNow.Date;
    private static DateTime UtcNow() => DateTime.UtcNow;

    // POST: /api/attendance/clock-in
    [HttpPost("clock-in")]
    public async Task<ActionResult<ClockActionResponse>> ClockIn(
     [FromHeader(Name = "X-UserId")] Guid userId,
     [FromHeader(Name = "X-Role")] string role)
    {
        if (userId == Guid.Empty) return BadRequest("Missing X-UserId.");
        var today = UtcToday();

        var existsUser = await _db.Users.AnyAsync(u => u.Id == userId);
        if (!existsUser) return NotFound("User not found.");

        // Is there an OPEN interval today? (ClockIn set, ClockOut null)
        var open = await _db.AttendanceLogs
            .AnyAsync(l => l.UserId == userId && l.WorkDate == today && l.ClockIn != null && l.ClockOut == null);

        if (open)
            return Conflict(new ClockActionResponse(userId, today, null, null, "Already clocked in. Please clock out first."));

        // Start a NEW interval row
        var log = new HrPortal.Domain.Entities.AttendanceLog
        {
            UserId = userId,
            WorkDate = today,
            ClockIn = UtcNow()
        };
        _db.AttendanceLogs.Add(log);
        await _db.SaveChangesAsync();
        return Ok(new ClockActionResponse(userId, today, log.ClockIn, log.ClockOut, "Clocked in."));
    }

    // POST: /api/attendance/clock-out
    // Accepts optional { taskId } and, if provided, links it and increments HoursSpent.
    [HttpPost("clock-out")]
    public async Task<ActionResult<ClockActionResponse>> ClockOut(
     [FromHeader(Name = "X-UserId")] Guid userId,
     [FromHeader(Name = "X-Role")] string role,
     [FromBody] ClockOutRequest? req)
    {
        if (userId == Guid.Empty) return BadRequest("Missing X-UserId.");
        var today = UtcToday();

        // Find the MOST RECENT open interval (no ClockOut) for today
        var log = await _db.AttendanceLogs
            .Where(l => l.UserId == userId && l.WorkDate == today && l.ClockIn != null && l.ClockOut == null)
            .OrderByDescending(l => l.ClockIn)
            .FirstOrDefaultAsync();

        if (log is null)
            return BadRequest(new ClockActionResponse(userId, today, null, null, "No open interval to clock out."));

        // Validate optional task & attach it to this interval
        if (req is not null && req.TaskId.HasValue)
        {
            var t = await _db.TaskItems.FirstOrDefaultAsync(x => x.Id == req.TaskId.Value);
            if (t is null)
                return BadRequest(new ClockActionResponse(userId, today, log.ClockIn, log.ClockOut, "Task not found."));
            if (t.UserId != userId)
                return Forbid("You can only attach your own tasks.");

            log.TaskId = t.Id;
        }

        // Close interval
        log.ClockOut = UtcNow();
        await _db.SaveChangesAsync();

        // Increment task.HoursSpent and the template total (if linked)
        if (log.TaskId.HasValue && log.ClockIn.HasValue && log.ClockOut.HasValue)
        {
            var duration = log.ClockOut.Value - log.ClockIn.Value;
            var hoursDec = Math.Round((decimal)Math.Max(0, duration.TotalHours), 2);

            if (hoursDec > 0)
            {
                var task = await _db.TaskItems.FirstOrDefaultAsync(t => t.Id == log.TaskId.Value);
                if (task is not null)
                {
                    // 1) Task
                    task.HoursSpent = (task.HoursSpent ?? 0m) + hoursDec;

                    // 2) Template
                    if (task.TemplateId != null)
                    {
                        var tpl = await _db.TaskTemplates.FirstOrDefaultAsync(tt => tt.Id == task.TemplateId);
                        if (tpl != null)
                        {
                            tpl.WorkedHours = (tpl.WorkedHours ?? 0m) + hoursDec;
                        }
                    }

                    await _db.SaveChangesAsync();
                }
            }
        }

        return Ok(new ClockActionResponse(userId, today, log.ClockIn, log.ClockOut, "Clocked out."));
    }


    // GET: /api/attendance/my?from=YYYY-MM-DD&to=YYYY-MM-DD
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<MyAttendanceItem>>> My(
        [FromHeader(Name = "X-UserId")] Guid userId,
        [FromHeader(Name = "X-Role")] string role,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        if (userId == Guid.Empty) return BadRequest("Missing X-UserId.");
        var start = (from ?? UtcToday().AddDays(-14)).Date;
        var end = (to ?? UtcToday()).Date;
        if (end < start) return BadRequest("Invalid date range.");

        var items = await _db.AttendanceLogs
            .AsNoTracking()
            .Where(l => l.UserId == userId && l.WorkDate.Date >= start && l.WorkDate.Date <= end)
            .OrderByDescending(l => l.WorkDate)
            .GroupJoin(_db.TaskItems.AsNoTracking(),
                       l => l.TaskId,
                       t => t.Id,
                       (l, tg) => new { l, tg })
            .SelectMany(x => x.tg.DefaultIfEmpty(),
                        (x, t) => new MyAttendanceItem(
                            x.l.WorkDate,
                            x.l.ClockIn,
                            x.l.ClockOut,
                            x.l.TaskId,
                            t != null ? t.TaskDescription : null
                        ))
            .ToListAsync();

        return Ok(items);
    }

    // GET: /api/attendance/team?date=YYYY-MM-DD (Manager/Admin)
    [HttpGet("team")]
    public async Task<ActionResult<IEnumerable<TeamAttendanceItem>>> Team(
     [FromHeader(Name = "X-UserId")] Guid callerId,
     [FromHeader(Name = "X-Role")] string role,
     [FromQuery] DateTime? date)
    {
        if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Manager/Admin required.");

        var day = (date ?? UtcToday()).Date;

        // --- 1) EF-friendly projection only (no ordering here) ---
        var projected = await _db.AttendanceLogs
            .AsNoTracking()
            .Where(l => l.WorkDate.Date == day)
            .Join(_db.Users.AsNoTracking(),
                  l => l.UserId,
                  u => u.Id,
                  (l, u) => new { l, u })
            .GroupJoin(_db.TaskItems.AsNoTracking(),
                  lu => lu.l.TaskId,
                  t => t.Id,
                  (lu, tg) => new { lu, tg })
            .SelectMany(x => x.tg.DefaultIfEmpty(), (x, t) => new TeamAttendanceItem(
                x.lu.u.Id,                    // UserId
                x.lu.u.Username,              // Username
                x.lu.l.WorkDate,              // WorkDate
                x.lu.l.ClockIn,               // ClockIn
                x.lu.l.ClockOut,              // ClockOut
                x.lu.l.TaskId,                // TaskId
                t != null ? t.TaskDescription : null // TaskDescription
            ))
            .ToListAsync();

        // --- 2) In-memory ordering (EF no longer involved) ---
        var data = projected
            // open intervals first
            .OrderBy(r => r.ClockOut == null ? 0 : 1)
            .ThenBy(r => r.Username)
            .ThenByDescending(r => r.ClockIn ?? DateTime.MinValue)
            .ToList();

        return Ok(data);
    }
}
