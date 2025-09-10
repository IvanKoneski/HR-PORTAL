namespace HrPortal.Api.Contracts
{
    public sealed class TemplateDto
    {
        public Guid Id { get; set; }
        public string TaskDescription { get; set; } = "";
        public decimal DefaultHours { get; set; }
        public decimal WorkedHours { get; set; }
    }
}
