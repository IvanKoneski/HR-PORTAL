namespace HrPortal.Api.Contracts;

public record ChangeUserRoleRequest(string Role);
public record ChangeUserRoleResponse(Guid UserId, string Username, string Role);

public record UserListItem(Guid UserId, string Username, string Role);
public record UpdateUserRequest(
       string? Username,
       string? Password,
       string? Role
   );

public record UpdateUserResponse(Guid UserId, string Username, string Role);