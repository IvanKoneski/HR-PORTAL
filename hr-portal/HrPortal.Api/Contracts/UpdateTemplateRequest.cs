namespace HrPortal.Api.Contracts
{
    public sealed class UpdateTemplateRequest
    {
        // Either (or both) can be provided
        public string? TaskDescription { get; set; }
        public decimal? DefaultHours { get; set; }
    }
}