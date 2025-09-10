using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HrPortal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TaskItem_AddTemplateLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "HoursSpent",
                table: "TaskItem",
                type: "decimal(10,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TemplateId",
                table: "TaskItem",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskItem_TemplateId",
                table: "TaskItem",
                column: "TemplateId");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskItem_TaskTemplates_TemplateId",
                table: "TaskItem",
                column: "TemplateId",
                principalTable: "TaskTemplates",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskItem_TaskTemplates_TemplateId",
                table: "TaskItem");

            migrationBuilder.DropIndex(
                name: "IX_TaskItem_TemplateId",
                table: "TaskItem");

            migrationBuilder.DropColumn(
                name: "TemplateId",
                table: "TaskItem");

            migrationBuilder.AlterColumn<decimal>(
                name: "HoursSpent",
                table: "TaskItem",
                type: "decimal(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(10,2)",
                oldNullable: true);
        }
    }
}
