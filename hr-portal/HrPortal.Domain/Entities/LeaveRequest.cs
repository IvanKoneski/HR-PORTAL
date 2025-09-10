using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrPortal.Domain.Entities
{
    public class LeaveRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }

        public DateTime StartDate { get; set; }    // date part used
        public DateTime EndDate { get; set; }      // date part used

        public string Reason { get; set; } = string.Empty;

        public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        // Manager who reviewed (optional)
        public Guid? ReviewedBy { get; set; }
        public DateTime? ReviewedAt { get; set; }

        // Navigation
        public User? User { get; set; }
        public User? Reviewer { get; set; }
    }
}
