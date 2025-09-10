using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HrPortal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Attendance_AddTaskLink_v3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TaskId",
                table: "AttendanceLogs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceLogs_TaskId",
                table: "AttendanceLogs",
                column: "TaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceLogs_TaskItem_TaskId",
                table: "AttendanceLogs",
                column: "TaskId",
                principalTable: "TaskItem",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceLogs_TaskItem_TaskId",
                table: "AttendanceLogs");

            migrationBuilder.DropIndex(
                name: "IX_AttendanceLogs_TaskId",
                table: "AttendanceLogs");

            migrationBuilder.DropColumn(
                name: "TaskId",
                table: "AttendanceLogs");
        }
    }
}
