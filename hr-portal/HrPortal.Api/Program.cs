using HrPortal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;



var builder = WebApplication.CreateBuilder(args);

const string FrontendCors = "FrontendCors";
builder.Services.AddCors(opt =>
{
    opt.AddPolicy(name: FrontendCors, policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000") // Vite/CRA
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddDbContext<HrPortalDbContext>(options => options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors(FrontendCors); // <— add

app.MapControllers();


app.Run();

