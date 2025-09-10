namespace HrPortal.Api.Contracts
{
    public record CreateLeaveRequestDto(DateTime StartDate, DateTime EndDate, string Reason);
    public record LeaveListItemDto(
     Guid Id,
     DateTime StartDate,
     DateTime EndDate,
     string Reason,
     string Status,
     DateTime SubmittedAt,
     string? ReviewedByUsername,
     DateTime? ReviewedAt
 );
    public record ManagerLeaveListItemDto(
     Guid Id,
     DateTime StartDate,
     DateTime EndDate,
     string Reason,
     string Status,
     DateTime SubmittedAt,
     string RequestedByUsername,
     string? ReviewedByUsername,
     DateTime? ReviewedAt
 );
    public record UpdateLeaveRequestDto(DateTime StartDate, DateTime EndDate, string Reason);
}
