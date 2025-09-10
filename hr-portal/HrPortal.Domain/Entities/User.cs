using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HrPortal.Domain.Entities;

namespace HrPortal.Domain.Entities
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Username { get; set; } = null!;
        // Keeping it simple for now (plain text). We can switch to a hash later with zero schema pain.
        public string Password { get; set; } = null!;

        // Allowed: "Admin" | "Manager" | "Employee"
        public string Role { get; set; } = "Employee";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
        public ICollection<AttendanceLog> AttendanceLogs { get; set; } = new List<AttendanceLog>();
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    }
}
