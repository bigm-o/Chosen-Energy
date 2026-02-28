namespace ChosenEnergy.API.Services;

public interface IFileService
{
    Task<string> SaveFileAsync(IFormFile file, string folderName);
}
