namespace HrPortal.Api.Contracts
{
    public sealed class AssignFromTemplateRequest
    {
        public Guid TemplateId { get; set; }
        public Guid UserId { get; set; }
        public DateTime WorkDate { get; set; }
        public decimal? HoursOverride { get; set; } // optional, else use DefaultHours
    }
}
