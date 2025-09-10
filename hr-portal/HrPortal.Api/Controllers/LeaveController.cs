using HrPortal.Api.Contracts;
using HrPortal.Domain.Entities;
using HrPortal.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HrPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeaveController : ControllerBase
{
    private readonly HrPortalDbContext _db;
    public LeaveController(HrPortalDbContext db) => _db = db;

    // Employee creates a leave request
    // Headers: X-UserId (Guid), X-Role (Employee/Manager/Admin)
    [HttpPost]
    public async Task<ActionResult> Create(
        [FromHeader(Name = "X-UserId")] Guid userId,
        [FromHeader(Name = "X-Role")] string role,
        [FromBody] CreateLeaveRequestDto dto)
    {
        // basic guard: only logged users; any role can create for themselves
        if (userId == Guid.Empty) return BadRequest("Missing X-UserId.");
        if (dto.StartDate.Date > dto.EndDate.Date) return BadRequest("StartDate must be <= EndDate.");

        var exists = await _db.Users.AnyAsync(u => u.Id == userId);
        if (!exists) return NotFound("User not found.");

        var lr = new LeaveRequest
        {
            UserId = userId,
            StartDate = dto.StartDate.Date,
            EndDate = dto.EndDate.Date,
            Reason = dto.Reason?.Trim() ?? "",
            Status = LeaveStatus.Pending,
            SubmittedAt = DateTime.UtcNow
        };

        _db.LeaveRequests.Add(lr);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetMy), null, new { id = lr.Id });
    }

    // Employee: list own leave requests
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<LeaveListItemDto>>> GetMy(
    [FromHeader(Name = "X-UserId")] Guid userId,
    [FromHeader(Name = "X-Role")] string role)
    {
        if (userId == Guid.Empty)
            return BadRequest("Missing X-UserId.");

        var data = await _db.LeaveRequests
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.SubmittedAt)
            .Select(x => new LeaveListItemDto(
                x.Id,
                x.StartDate,
                x.EndDate,
                x.Reason,
                x.Status.ToString(),
                x.SubmittedAt,
                _db.Users.Where(u => u.Id == x.ReviewedBy).Select(u => u.Username).FirstOrDefault(),
                x.ReviewedAt))
            .ToListAsync();

        return Ok(data);
    }



    // Manager: list all pending
    [HttpGet("pending")]
    public async Task<ActionResult<IEnumerable<ManagerLeaveListItemDto>>> GetPending(
      [FromHeader(Name = "X-UserId")] Guid userId,
      [FromHeader(Name = "X-Role")] string role)
    {
        if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Manager/Admin required.");

        var data = await _db.LeaveRequests
            .AsNoTracking()
            .Where(x => x.Status == LeaveStatus.Pending)
            .OrderBy(x => x.SubmittedAt)
            .Select(x => new ManagerLeaveListItemDto(
                x.Id,
                x.StartDate,
                x.EndDate,
                x.Reason,
                x.Status.ToString(),
                x.SubmittedAt,
                _db.Users.Where(u => u.Id == x.UserId).Select(u => u.Username).FirstOrDefault() ?? "",
                _db.Users.Where(u => u.Id == x.ReviewedBy).Select(u => u.Username).FirstOrDefault(),
                x.ReviewedAt))
            .ToListAsync();

        return Ok(data);
    }

    // Manager: approve
    [HttpPut("{id:guid}/approve")]
    public async Task<ActionResult> Approve(
        Guid id,
        [FromHeader(Name = "X-UserId")] Guid reviewerId,
        [FromHeader(Name = "X-Role")] string role)
    {
        if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Manager/Admin required.");

        var lr = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (lr is null) return NotFound();
        if (lr.Status != LeaveStatus.Pending) return BadRequest("Only pending requests can be approved.");

        lr.Status = LeaveStatus.Approved;
        lr.ReviewedBy = reviewerId;
        lr.ReviewedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Manager: reject
    [HttpPut("{id:guid}/reject")]
    public async Task<ActionResult> Reject(
        Guid id,
        [FromHeader(Name = "X-UserId")] Guid reviewerId,
        [FromHeader(Name = "X-Role")] string role)
    {
        if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Manager/Admin required.");

        var lr = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (lr is null) return NotFound();
        if (lr.Status != LeaveStatus.Pending) return BadRequest("Only pending requests can be rejected.");

        lr.Status = LeaveStatus.Rejected;
        lr.ReviewedBy = reviewerId;
        lr.ReviewedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }
    // PUT /api/leave/{id}  (Admin only, only if Pending)
    [HttpPut("{id:guid}/edit")]
    public async Task<ActionResult> EditPending(
        Guid id,
        [FromHeader(Name = "X-Role")] string role,
        [FromBody] UpdateLeaveRequestDto dto)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin required.");

        if (dto.StartDate.Date > dto.EndDate.Date)
            return BadRequest("StartDate must be <= EndDate.");

        var lr = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (lr is null) return NotFound();
        if (lr.Status != LeaveStatus.Pending)
            return BadRequest("Only pending requests can be edited.");

        lr.StartDate = dto.StartDate.Date;
        lr.EndDate = dto.EndDate.Date;
        lr.Reason = dto.Reason?.Trim() ?? "";

        await _db.SaveChangesAsync();
        return NoContent();
    }
    // DELETE /api/leave/{id}  (Admin only, only if Pending)
    [HttpDelete("{id:guid}/delete")]
    public async Task<ActionResult> DeletePending(
        Guid id,
        [FromHeader(Name = "X-Role")] string role)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin required.");

        var lr = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (lr is null) return NotFound();
        if (lr.Status != LeaveStatus.Pending)
            return BadRequest("Only pending requests can be deleted.");

        _db.LeaveRequests.Remove(lr);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
