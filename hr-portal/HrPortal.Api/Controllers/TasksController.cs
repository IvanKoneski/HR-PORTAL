using HrPortal.Api.Contracts;
using HrPortal.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HrPortal.Domain.Entities;

namespace HrPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly HrPortalDbContext _db;
    public TasksController(HrPortalDbContext db) => _db = db;

    private static DateTime UtcDay(DateTime dt) => dt.Date; // keep it simple

    // POST /api/tasks  (Employee/Manager/Admin can upsert their own task for a day)
    [HttpPost]
    public async Task<ActionResult<MyTaskItem>> UpsertMyTask(
        [FromHeader(Name = "X-UserId")] Guid userId,
        [FromHeader(Name = "X-Role")] string role,
        [FromBody] UpsertTaskRequest req)
    {
        if (userId == Guid.Empty) return BadRequest("Missing X-UserId.");
        if (string.IsNullOrWhiteSpace(req.TaskDescription)) return BadRequest("TaskDescription is required.");

        var existsUser = await _db.Users.AnyAsync(u => u.Id == userId);
        if (!existsUser) return NotFound("User not found.");

        var workDate = UtcDay(req.WorkDate);

        // policy: allow multiple tasks per day (common). If you want one-per-day, change this to FirstOrDefaultAsync.
        var task = new TaskItem
        {
            UserId = userId,
            WorkDate = workDate,
            TaskDescription = req.TaskDescription.Trim(),
            HoursSpent = req.HoursSpent
        };

        _db.TaskItems.Add(task);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyByDate), new { date = workDate.ToString("yyyy-MM-dd") },
            new MyTaskItem(task.Id, task.WorkDate, task.TaskDescription, task.HoursSpent));
    }

    // GET /api/tasks/my?date=YYYY-MM-DD
    // If date omitted, defaults to today (UTC).
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<MyTaskItem>>> GetMyByDate(
        [FromHeader(Name = "X-UserId")] Guid userId,
        [FromHeader(Name = "X-Role")] string role,
        [FromQuery] DateTime? date)
    {
        if (userId == Guid.Empty) return BadRequest("Missing X-UserId.");
        var day = UtcDay(date ?? DateTime.UtcNow);

        var items = await _db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.WorkDate == day)
            .OrderBy(t => t.Id)
            .Select(t => new MyTaskItem(t.Id, t.WorkDate, t.TaskDescription, t.HoursSpent))
            .ToListAsync();

        return Ok(items);
    }
    // GET /api/tasks/my/list?from=yyyy-MM-dd&to=yyyy-MM-dd
    // Returns ALL tasks for the logged‑in user if from/to are omitted.
    [HttpGet("my/list")]
    public async Task<ActionResult<IEnumerable<MyTaskItem>>> GetMyAll(
        [FromHeader(Name = "X-UserId")] Guid userId,
        [FromHeader(Name = "X-Role")] string role,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        if (userId == Guid.Empty) return BadRequest("Missing X-UserId.");

        var q = _db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (from.HasValue) q = q.Where(t => t.WorkDate >= from.Value.Date);
        if (to.HasValue) q = q.Where(t => t.WorkDate <= to.Value.Date);

        var items = await q
            .OrderByDescending(t => t.WorkDate)
            .ThenBy(t => t.Id)
            .Select(t => new MyTaskItem(t.Id, t.WorkDate, t.TaskDescription, t.HoursSpent))
            .ToListAsync();

        return Ok(items);
    }

    // GET /api/tasks/team?date=YYYY-MM-DD  (Manager/Admin)
    [HttpGet("team")]
    public async Task<ActionResult<IEnumerable<TeamTaskItem>>> GetTeamByDate(
        [FromHeader(Name = "X-UserId")] Guid callerId,
        [FromHeader(Name = "X-Role")] string role,
        [FromQuery] DateTime? date)
    {
        if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Manager/Admin required.");

        var day = UtcDay(date ?? DateTime.UtcNow);

        var query =
            from t in _db.TaskItems.AsNoTracking()
            join u in _db.Users.AsNoTracking() on t.UserId equals u.Id
            where t.WorkDate == day
            orderby u.Username, t.Id
            select new TeamTaskItem(u.Id, u.Username, t.Id, t.WorkDate, t.TaskDescription, t.HoursSpent);

        var data = await query.ToListAsync();
        return Ok(data);
    }
    // POST /api/tasks/admin  (Admin only) - create a task for any user
    [HttpPost("admin/create")]
    public async Task<ActionResult<MyTaskItem>> AdminCreate(
        [FromHeader(Name = "X-Role")] string role,
        [FromBody] AdminUpsertTaskRequest req)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin required.");

        if (string.IsNullOrWhiteSpace(req.TaskDescription))
            return BadRequest("TaskDescription is required.");

        var userExists = await _db.Users.AnyAsync(u => u.Id == req.UserId);
        if (!userExists) return NotFound("Target user not found.");

        var day = req.WorkDate.Date;

        var task = new TaskItem
        {
            UserId = req.UserId,
            WorkDate = day,
            TaskDescription = req.TaskDescription.Trim(),
            HoursSpent = req.HoursSpent
        };

        _db.TaskItems.Add(task);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyByDate), new { date = day.ToString("yyyy-MM-dd") },
            new MyTaskItem(task.Id, task.WorkDate, task.TaskDescription, task.HoursSpent));
    }

    // PUT /api/tasks/{id}/edit  (Admin only) - edit any task
    [HttpPut("{id:guid}/edit")]
    public async Task<ActionResult> AdminEdit(
     Guid id,
     [FromHeader(Name = "X-Role")] string role,
     [FromBody] UpdateTaskRequest req)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin required.");

        var task = await _db.TaskItems.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.TaskDescription))
            task.TaskDescription = req.TaskDescription.Trim();

        if (req.HoursSpent.HasValue)
            task.HoursSpent = req.HoursSpent.Value;

        if (req.WorkDate.HasValue)
            task.WorkDate = UtcDay(req.WorkDate.Value);   // normalize to date only

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/tasks/{id}/delete  (Admin only) - delete any task
    [HttpDelete("{id:guid}/delete")]
    public async Task<ActionResult> AdminDelete(
        Guid id,
        [FromHeader(Name = "X-Role")] string role)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin required.");

        var task = await _db.TaskItems.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return NotFound();

        _db.TaskItems.Remove(task);
        await _db.SaveChangesAsync();
        return NoContent();
    }
    // PUT /api/tasks/{id}/hours  (Employee/Admin can update hours only)
    [HttpPut("{id:guid}/hours")]
    public async Task<IActionResult> UpdateMyHours(
     Guid id,
     [FromHeader(Name = "X-UserId")] Guid callerId,
     [FromHeader(Name = "X-Role")] string role,
     [FromBody] UpdateHoursRequest req)
    {
        if (callerId == Guid.Empty) return BadRequest("Missing X-UserId.");
        if (req is null) return BadRequest("Body required.");
        if (req.HoursSpent < 0) return BadRequest("Hours must be >= 0.");

        var task = await _db.TaskItems.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return NotFound();

        // If not Admin, must own the task
        var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);
        if (!isAdmin && task.UserId != callerId)
            return Forbid("You can only update your own tasks.");

        // compute delta
        var oldHours = task.HoursSpent ?? 0m;
        var newHours = req.HoursSpent;
        var delta = newHours - oldHours;

        // set task hours
        task.HoursSpent = newHours;

        // if the task was created from a template, roll the delta into the template's WorkedHours
        if (delta != 0 && task.TemplateId.HasValue)
        {
            var tpl = await _db.TaskTemplates.FirstOrDefaultAsync(x => x.Id == task.TemplateId.Value);
            if (tpl is not null)
            {
                var current = tpl.WorkedHours ?? 0m;
                var updated = current + delta;
                tpl.WorkedHours = updated < 0m ? 0m : updated; // guard against negative totals
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
    // GET /api/tasks/all?from=yyyy-MM-dd&to=yyyy-MM-dd&userId=<optional>
    [HttpGet("all")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IEnumerable<TaskListDto>>> GetAllTasks(
        [FromHeader(Name = "X-UserId")] Guid callerId,
        [FromHeader(Name = "X-Role")] string role,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        [FromQuery] Guid? userId // optional
    )
    {
        if (from > to) return BadRequest("from must be <= to");

        // Only Admin & Manager can list all tasks (per your simplification)
        var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);
        var isManager = string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase);
        if (!(isAdmin || isManager)) return Forbid("Only Admin or Manager can list all tasks.");

        var q = _db.TaskItems
            .Include(t => t.User)
            .Where(t => t.WorkDate >= from && t.WorkDate <= to);

        if (userId.HasValue && userId.Value != Guid.Empty)
            q = q.Where(t => t.UserId == userId.Value);

        var data = await q
            .OrderBy(t => t.WorkDate)
            .ThenBy(t => t.User.Username)
            .Select(t => new TaskListDto
            {
                Id = t.Id,
                UserId = t.UserId,
                Username = t.User.Username,
                WorkDate = t.WorkDate,
                TaskDescription = t.TaskDescription,
                HoursSpent = (decimal)t.HoursSpent
            })
            .ToListAsync();

        return Ok(data);
    }
    // ADMIN: create a template (unassigned task)
    // ====== Task Templates (Admin) ======

    [HttpPost("templates")]
    public async Task<ActionResult<TemplateDto>> CreateTemplate(
    [FromHeader(Name = "X-Role")] string role,
    [FromBody] CreateTemplateRequest req)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin required.");
        if (string.IsNullOrWhiteSpace(req.TaskDescription))
            return BadRequest("TaskDescription is required.");

        var tpl = new TaskTemplate
        {
            Id = Guid.NewGuid(),
            TaskDescription = req.TaskDescription.Trim(),
            DefaultHours = (req.DefaultHours.HasValue && req.DefaultHours.Value > 0)
                ? req.DefaultHours.Value
                : 1m
            // WorkedHours defaults to 0 via mapping
        };

        _db.TaskTemplates.Add(tpl);
        await _db.SaveChangesAsync();

        return Ok(new TemplateDto
        {
            Id = tpl.Id,
            TaskDescription = tpl.TaskDescription,
            DefaultHours = tpl.DefaultHours,
            WorkedHours = tpl.WorkedHours ?? 0m   
        });
    }

    // GET /api/tasks/templates  (Admin or Manager)
    [HttpGet("templates")]
    public async Task<ActionResult<IEnumerable<TemplateDto>>> ListTemplates(
      [FromHeader(Name = "X-Role")] string role)
    {
        var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);
        var isManager = string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase);
        if (!(isAdmin || isManager))
            return StatusCode(403, "Admin or Manager required."); // avoid Forbid() crash

        var data = await _db.TaskTemplates
            .Where(x => x.Active)
            .OrderBy(x => x.TaskDescription)
            .Select(x => new TemplateDto
            {
                Id = x.Id,
                TaskDescription = x.TaskDescription,
                DefaultHours = x.DefaultHours,
                WorkedHours = x.WorkedHours ?? 0m
            })
            .ToListAsync();

        return Ok(data);
    }


    [HttpDelete("templates/{id:guid}")]
    public async Task<IActionResult> DeleteTemplate(
        [FromHeader(Name = "X-Role")] string role, Guid id)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid();

        var tpl = await _db.TaskTemplates.FirstOrDefaultAsync(x => x.Id == id);
        if (tpl is null) return NotFound();

        tpl.Active = false; // soft delete; or _db.TaskTemplates.Remove(tpl);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ====== Assign from Template (Admin) ======

    // POST /api/tasks/admin/assign-from-template   (Admin)
    // POST /api/tasks/admin/assign-from-template  (Admin or Manager)
    [HttpPost("admin/assign-from-template")]
    public async Task<ActionResult> AssignFromTemplate(
     [FromHeader(Name = "X-Role")] string role,
     [FromBody] AssignFromTemplateRequest req)
    {
        var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);
        var isManager = string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase);
        if (!(isAdmin || isManager))
            return StatusCode(403, "Admin or Manager required."); // instead of Forbid()

        var tpl = await _db.TaskTemplates.FirstOrDefaultAsync(x => x.Id == req.TemplateId && x.Active);
        if (tpl is null) return NotFound("Template not found.");

        var userExists = await _db.Users.AnyAsync(u => u.Id == req.UserId);
        if (!userExists) return BadRequest("User not found.");

        var hours = req.HoursOverride.HasValue ? req.HoursOverride.Value : tpl.DefaultHours;
        if (hours < 0) return BadRequest("Hours cannot be negative.");

        var task = new TaskItem
        {
            Id = Guid.NewGuid(),
            UserId = req.UserId,
            WorkDate = req.WorkDate.Date,
            TaskDescription = tpl.TaskDescription,
            HoursSpent = hours,
            TemplateId = tpl.Id
        };

        _db.TaskItems.Add(task);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTaskById), new { id = task.Id }, new
        {
            task.Id,
            task.UserId,
            task.WorkDate,
            task.TaskDescription,
            task.HoursSpent
        });
    }
    // PUT /api/tasks/templates/{id}  (Admin only) — update description/default-hours
    [HttpPut("templates/{id:guid}")]
    public async Task<ActionResult<TemplateDto>> UpdateTemplate(
        Guid id,
        [FromHeader(Name = "X-UserId")] Guid callerId,
        [FromHeader(Name = "X-Role")] string role,
        [FromBody] UpdateTemplateRequest req)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin only.");

        var tpl = await _db.TaskTemplates.FirstOrDefaultAsync(t => t.Id == id);
        if (tpl is null) return NotFound();

        if (req.TaskDescription is not null)
            tpl.TaskDescription = req.TaskDescription.Trim();

        if (req.DefaultHours.HasValue)
            tpl.DefaultHours = req.DefaultHours.Value;

        await _db.SaveChangesAsync();

        return Ok(new TemplateDto
        {
            Id = tpl.Id,
            TaskDescription = tpl.TaskDescription,
            DefaultHours = tpl.DefaultHours
        });
    }



    // Optional helper for CreatedAtAction
    [HttpGet("{id:guid}")]
    public async Task<ActionResult> GetTaskById(Guid id)
    {
        var t = await _db.TaskItems.Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id);
        if (t is null) return NotFound();

        return Ok(new
        {
            t.Id,
            t.UserId,
            Username = t.User.Username,
            t.WorkDate,
            t.TaskDescription,
            t.HoursSpent
        });
    }

}
