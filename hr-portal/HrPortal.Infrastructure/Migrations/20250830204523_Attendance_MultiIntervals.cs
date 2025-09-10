using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HrPortal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Attendance_MultiIntervals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AttendanceLogs_UserId_WorkDate",
                table: "AttendanceLogs");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceLogs_UserId_WorkDate",
                table: "AttendanceLogs",
                columns: new[] { "UserId", "WorkDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AttendanceLogs_UserId_WorkDate",
                table: "AttendanceLogs");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceLogs_UserId_WorkDate",
                table: "AttendanceLogs",
                columns: new[] { "UserId", "WorkDate" },
                unique: true);
        }
    }
}
