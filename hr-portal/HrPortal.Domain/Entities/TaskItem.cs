using HrPortal.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public class TaskItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    // Link tasks to a specific working day (same idea as AttendanceLog.WorkDate)
    public DateTime WorkDate { get; set; }   // use date part; store UTC

    public string TaskDescription { get; set; } = string.Empty;

    // Optional estimate/actual time, keep it simple in hours (decimals allowed)
    public decimal? HoursSpent { get; set; }

    // Navigation
    public User? User { get; set; }
    public Guid? TemplateId { get; set; }          //  which template this task came from
    public TaskTemplate? Template { get; set; }
}