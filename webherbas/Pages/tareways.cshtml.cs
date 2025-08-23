using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.ComponentModel.DataAnnotations;

namespace webherbas.Pages
{
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    [IgnoreAntiforgeryToken]
    public class CustomErrorModel : PageModel
    {
        public string? RequestId { get; set; }

        public bool ShowRequestId => !string.IsNullOrEmpty(RequestId);

        private readonly ILogger<CustomErrorModel> _logger;

        public CustomErrorModel(ILogger<CustomErrorModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
            RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        }
    }

    public class TarewaysModel : PageModel
    {
        [BindProperty]
        public ElementoInputModel NuevaTarea { get; set; } = new ElementoInputModel();
        
        public string CurrentStatus { get; set; } = "todo";

        public void OnGet(string? status)
        {
            // Establecer el estado actual basado en la ruta
            CurrentStatus = status ?? "todo";
            
            // Validar que el status sea v�lido
            if (!IsValidStatus(CurrentStatus))
            {
                CurrentStatus = "todo";
            }
        }

        public IActionResult OnPost(string? status)
        {
            CurrentStatus = status ?? "todo";
            
            if (!ModelState.IsValid)
            {
                return Page();
            }
            
            // Agregar mensaje de confirmaci�n
            TempData["SuccessMessage"] = "Elemento creado exitosamente";
            
            // Limpiar el modelo para el siguiente elemento
            NuevaTarea = new ElementoInputModel();
            
            // Redirigir a la p�gina de pendientes (donde se crean las tareas)
            return RedirectToPage("/tareways", new { status = "todo" });
        }
        
        private bool IsValidStatus(string status)
        {
            return status == "todo" || status == "progress" || status == "done";
        }
    }

    public class ElementoInputModel
    {
        [Required(ErrorMessage = "El t�tulo es obligatorio")]
        [StringLength(100, ErrorMessage = "El t�tulo no puede exceder 100 caracteres")]
        [Display(Name = "T�tulo del elemento")]
        public string Titulo { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "La descripci�n no puede exceder 500 caracteres")]
        [Display(Name = "Descripci�n")]
        public string? Descripcion { get; set; }

        [Required(ErrorMessage = "La fecha l�mite es obligatoria")]
        [Display(Name = "Fecha l�mite")]
        [DataType(DataType.Date)]
        public DateTime? FechaVencimiento { get; set; }
    }
}
