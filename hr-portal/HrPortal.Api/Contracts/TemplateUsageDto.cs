namespace HrPortal.Api.Contracts;

public record TemplateUsageDto(
    Guid Id,
    string TaskDescription,
    decimal DefaultHours,
    decimal WorkedHours
);
