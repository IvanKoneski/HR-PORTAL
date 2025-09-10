namespace HrPortal.Api.Contracts
{
    public sealed class CreateTemplateRequest
    {
        public string TaskDescription { get; set; } = "";
        public decimal? DefaultHours { get; set; } // optional, fallback to 1
    }
}
