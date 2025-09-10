public sealed class TaskListDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Username { get; set; } = "";
    public DateTime WorkDate { get; set; }
    public string TaskDescription { get; set; } = "";
    public decimal HoursSpent { get; set; }
}