using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HrPortal.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HrPortal.Infrastructure.Data
{
    public class HrPortalDbContext : DbContext
    {
        public HrPortalDbContext(DbContextOptions<HrPortalDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
        public DbSet<AttendanceLog> AttendanceLogs => Set<AttendanceLog>();
        public DbSet<TaskItem> TaskItems => Set<TaskItem>();
        public DbSet<TaskTemplate> TaskTemplates => Set<TaskTemplate>();

        protected override void OnModelCreating(ModelBuilder b)
        {
            base.OnModelCreating(b);

            b.Entity<TaskTemplate>(e =>
            {
                e.ToTable("TaskTemplates");
                e.HasKey(x => x.Id);

                e.Property(x => x.TaskDescription)
                    .HasMaxLength(500)
                    .IsRequired();

                e.Property(x => x.DefaultHours)
                    .HasColumnType("decimal(10,2)")  
                    .HasDefaultValue(1m);

  
                e.Property(x => x.WorkedHours)
                    .HasColumnType("decimal(10,2)")
                    .HasDefaultValue(0m);

                e.Property(x => x.Active).HasDefaultValue(true);
            });

            // === LeaveRequests ===
            b.Entity<LeaveRequest>(e =>
            {
                e.HasKey(x => x.Id);
                e.Property(x => x.Reason).HasMaxLength(500);
                e.Property(x => x.StartDate).IsRequired();
                e.Property(x => x.EndDate).IsRequired();
                e.Property(x => x.Status).IsRequired();
                e.Property(x => x.SubmittedAt).IsRequired();

                e.HasOne(x => x.User)
                 .WithMany(u => u.LeaveRequests)
                 .HasForeignKey(x => x.UserId)
                 .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(x => x.Reviewer)
                 .WithMany()
                 .HasForeignKey(x => x.ReviewedBy)
                 .OnDelete(DeleteBehavior.NoAction);
            });

            // === AttendanceLogs ===
            b.Entity<AttendanceLog>(e =>
            {
                e.HasKey(x => x.Id);
                e.Property(x => x.WorkDate).IsRequired();

                e.HasIndex(x => new { x.UserId, x.WorkDate });

                e.HasOne(x => x.User)
                    .WithMany(u => u.AttendanceLogs)
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade); // leave this as it was

                // CHANGE THIS LINE (SetNull -> NoAction)
                e.HasOne(x => x.Task)
                    .WithMany()
                    .HasForeignKey(x => x.TaskId)
                    .OnDelete(DeleteBehavior.NoAction);

                e.HasIndex(x => x.TaskId);
            });
            // === TaskItems ===
            b.Entity<TaskItem>(e =>
            {
                e.ToTable("TaskItem");
                e.HasKey(x => x.Id);
                e.Property(x => x.TaskDescription).HasMaxLength(1000).IsRequired();
                e.Property(x => x.WorkDate).IsRequired();

                // (optional, but good) set precision for HoursSpent
                e.Property(x => x.HoursSpent).HasColumnType("decimal(10,2)");

                // index to speed up day/user queries (you already had this)
                e.HasIndex(x => new { x.UserId, x.WorkDate });

                e.HasOne(x => x.User)
                 .WithMany(u => u.Tasks)
                 .HasForeignKey(x => x.UserId)
                 .OnDelete(DeleteBehavior.Cascade);

                // NEW: optional link from TaskItem → TaskTemplate
                e.HasOne(x => x.Template)
                 .WithMany()
                 .HasForeignKey(x => x.TemplateId)
                 .OnDelete(DeleteBehavior.NoAction);

                e.HasIndex(x => x.TemplateId);   // NEW: helps when aggregating by template
            });
            // === Seed default users ===
            b.Entity<User>().HasData(
                new User
                {
                    Id = new Guid("11111111-1111-1111-1111-111111111111"),
                    Username = "admin",
                    Password = "admin123",      // plain for now (kept simple)
                    Role = "Admin",
                    CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new User
                {
                    Id = new Guid("22222222-2222-2222-2222-222222222222"),
                    Username = "manager",
                    Password = "manager123",
                    Role = "Manager",
                    CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new User
                {
                    Id = new Guid("33333333-3333-3333-3333-333333333333"),
                    Username = "emp",
                    Password = "emp123",
                    Role = "Employee",
                    CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );

        }
    }
}
