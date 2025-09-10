namespace HrPortal.Api.Contracts
{

    // Request sent from the login form
    public record LoginRequest(string Username, string Password);

    // Response returned on successful login
    public record LoginResponse(Guid UserId, string Username, string Role);

    // Admin creates users with this request
    public record CreateUserRequest(string Username, string Password, string Role);

    // Response after creating a user
    public record CreateUserResponse(Guid UserId, string Username, string Role);
}
