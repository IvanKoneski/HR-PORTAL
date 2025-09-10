using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrPortal.Domain.Entities
{
    public class AttendanceLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }

        // We’ll store the *day* (date part only)
        public DateTime WorkDate { get; set; }

        public DateTime? ClockIn { get; set; }
        public DateTime? ClockOut { get; set; }
        public Guid? TaskId { get; set; }          // <— add this
        public TaskItem? Task { get; set; }

        // Navigation
        public User? User { get; set; }
    }
}
