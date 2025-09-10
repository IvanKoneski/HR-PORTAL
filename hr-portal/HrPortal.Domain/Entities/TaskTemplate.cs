using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrPortal.Domain.Entities
{
    public class TaskTemplate
    {
        public Guid Id { get; set; }
        public string TaskDescription { get; set; } = "";
        public decimal DefaultHours { get; set; } = 1m;
        public decimal? WorkedHours { get; set; } = 0m;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool Active { get; set; } = true;
    }
}
