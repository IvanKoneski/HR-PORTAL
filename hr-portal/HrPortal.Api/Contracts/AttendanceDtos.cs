namespace HrPortal.Api.Contracts;

public record ClockActionResponse(
    Guid UserId,
    DateTime WorkDate,
    DateTime? ClockIn,
    DateTime? ClockOut,
    string Message);

public record MyAttendanceItem(
    DateTime WorkDate,
    DateTime? ClockIn,
    DateTime? ClockOut,
    Guid? TaskId = null,             // NEW
    string? TaskDescription = null   // NEW
);

public record TeamAttendanceItem(
    Guid UserId,
    string Username,
    DateTime WorkDate,
    DateTime? ClockIn,
    DateTime? ClockOut,
    Guid? TaskId = null,             // NEW
    string? TaskDescription = null   // NEW
);