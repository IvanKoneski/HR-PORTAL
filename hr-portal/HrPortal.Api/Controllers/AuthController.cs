using HrPortal.Api.Contracts;
using HrPortal.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HrPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly HrPortalDbContext _db;
    public AuthController(HrPortalDbContext db) => _db = db;

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Username and password are required.");

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == req.Username && u.Password == req.Password);

        if (user is null) return Unauthorized("Invalid credentials.");

        return Ok(new LoginResponse(user.Id, user.Username, user.Role));
    }
}