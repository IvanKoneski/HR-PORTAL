using HrPortal.Api.Contracts;
using HrPortal.Domain.Entities;
using HrPortal.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HrPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly HrPortalDbContext _db;
    public UsersController(HrPortalDbContext db) => _db = db;

    // MVP "admin" check: send header X-Role: Admin in Swagger when calling admin endpoints
    private bool IsAdmin() =>
        Request.Headers.TryGetValue("X-Role", out var v) &&
        string.Equals(v.ToString(), "Admin", StringComparison.OrdinalIgnoreCase);

    // POST /api/users  (Admin only)
    [HttpPost]
    public async Task<ActionResult<CreateUserResponse>> Create(
     [FromHeader(Name = "X-UserId")] string? userId,
     [FromHeader(Name = "X-Role")] string? role,
     [FromBody] CreateUserRequest req)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin role required.");

        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Username and password are required.");

        var exists = await _db.Users.AnyAsync(u => u.Username == req.Username);
        if (exists) return Conflict("Username already exists.");

        var user = new User
        {
            Username = req.Username.Trim(),
            Password = req.Password,
            Role = string.IsNullOrWhiteSpace(req.Role) ? "Employee" : req.Role.Trim()
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id },
            new CreateUserResponse(user.Id, user.Username, user.Role));
    }

    // GET /api/users/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CreateUserResponse>> GetById(Guid id)
    {
        var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (u is null) return NotFound();
        return Ok(new CreateUserResponse(u.Id, u.Username, u.Role));
    }

    // PUT /api/users/{id}/role  (Admin only)
    [HttpPut("{id:guid}/role")]
    public async Task<ActionResult<ChangeUserRoleResponse>> ChangeRole(
        Guid id,
        [FromHeader(Name = "X-UserId")] string? adminId,
        [FromHeader(Name = "X-Role")] string? roleHeader,
        [FromBody] ChangeUserRoleRequest req)
    {
        if (!string.Equals(roleHeader, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin role required.");

        var allowed = new[] { "Admin", "Manager", "Employee" };
        if (string.IsNullOrWhiteSpace(req.Role) || !allowed.Contains(req.Role, StringComparer.OrdinalIgnoreCase))
            return BadRequest("Role must be one of: Admin, Manager, Employee.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound("User not found.");

        user.Role = allowed.First(r => r.Equals(req.Role, StringComparison.OrdinalIgnoreCase));
        await _db.SaveChangesAsync();

        return Ok(new ChangeUserRoleResponse(user.Id, user.Username, user.Role));
    }
    // GET /api/users  (Admin or Manager)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserListItem>>> GetAll(
        [FromHeader(Name = "X-Role")] string? roleHeader)
    {
        var isAdmin = string.Equals(roleHeader, "Admin", StringComparison.OrdinalIgnoreCase);
        var isManager = string.Equals(roleHeader, "Manager", StringComparison.OrdinalIgnoreCase);
        if (!(isAdmin || isManager))
            return StatusCode(403, "Admin or Manager required."); // avoid Forbid()

        var users = await _db.Users
            .AsNoTracking()
            .OrderBy(u => u.Username)
            .Select(u => new UserListItem(u.Id, u.Username, u.Role))
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UpdateUserResponse>> UpdateUser(
    Guid id,
    [FromHeader(Name = "X-UserId")] Guid callerId,
    [FromHeader(Name = "X-Role")] string role,
    [FromBody] UpdateUserRequest req)
    {
        // Basic admin gate – matches the pattern you already use
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin role required.");

        if (callerId == Guid.Empty)
            return BadRequest("Missing X-UserId.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound("User not found.");

        // Username
        if (!string.IsNullOrWhiteSpace(req.Username))
        {
            var newName = req.Username.Trim();
            var exists = await _db.Users.AnyAsync(u => u.Id != id && u.Username == newName);
            if (exists) return Conflict("Username already exists.");
            user.Username = newName;
        }

        // Role
        if (!string.IsNullOrWhiteSpace(req.Role))
        {
            var allowed = new[] { "Admin", "Manager", "Employee" };
            if (!allowed.Contains(req.Role, StringComparer.OrdinalIgnoreCase))
                return BadRequest("Role must be one of: Admin, Manager, Employee.");
            user.Role = allowed.First(r => r.Equals(req.Role, StringComparison.OrdinalIgnoreCase));
        }

        // Password
        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            // NOTE: mirror your create logic; if you hash at create, hash here too.
            user.Password = req.Password;
        }

        await _db.SaveChangesAsync();

        return Ok(new UpdateUserResponse(user.Id, user.Username, user.Role));
    }
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteUser(
    Guid id,
    [FromHeader(Name = "X-UserId")] Guid callerId,
    [FromHeader(Name = "X-Role")] string role)
    {
        if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return Forbid("Admin role required.");

        if (callerId == Guid.Empty)
            return BadRequest("Missing X-UserId.");

        // Prevent deleting your own account
        if (id == callerId)
            return BadRequest("You cannot delete your own account.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}