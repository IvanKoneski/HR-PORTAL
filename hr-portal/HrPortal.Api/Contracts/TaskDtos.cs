namespace HrPortal.Api.Contracts;

public record UpsertTaskRequest(
    DateTime WorkDate,            // date of the task (UTC date part will be used)
    string TaskDescription,       // required
    decimal? HoursSpent           // optional, e.g., 1.5
);

public record MyTaskItem(
    Guid Id,
    DateTime WorkDate,
    string TaskDescription,
    decimal? HoursSpent
);

public record TeamTaskItem(
    Guid UserId,
    string Username,
    Guid TaskId,
    DateTime WorkDate,
    string TaskDescription,
    decimal? HoursSpent
);
public record AdminUpsertTaskRequest(
    Guid UserId,
    DateTime WorkDate,
    string TaskDescription,
    decimal? HoursSpent
);

public record UpdateTaskRequest(
        string? TaskDescription,
        decimal? HoursSpent,
        DateTime? WorkDate   // NEW: send as "YYYY-MM-DD" or full ISO date
    );