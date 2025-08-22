// Sistema de gestión de elementos de trabajo con interface visual

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('formNuevaTarea');
    const columns = {
        todo: document.getElementById('todo-tasks'),
        progress: document.getElementById('progress-tasks'),
        done: document.getElementById('done-tasks')
    };
    
    const counters = {
        todo: document.getElementById('todo-count'),
        progress: document.getElementById('progress-count'),
        done: document.getElementById('done-count')
    };

    let workItems = JSON.parse(localStorage.getItem('workflowItems') || '[]');

    function saveItems() {
        localStorage.setItem('workflowItems', JSON.stringify(workItems));
        updateCounters();
    }

    function updateCounters() {
        if (counters.todo) counters.todo.textContent = workItems.filter(item => item.status === 'todo').length;
        if (counters.progress) counters.progress.textContent = workItems.filter(item => item.status === 'progress').length;
        if (counters.done) counters.done.textContent = workItems.filter(item => item.status === 'done').length;
    }

    function createWorkItem(item) {
        const card = document.createElement('div');
        card.className = 'workflow-item';
        card.draggable = true;
        card.dataset.id = item.id;
        card.setAttribute('role', 'listitem');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Elemento: ${item.titulo}`);
        
        card.innerHTML = `
            <div class="item-title">${escapeHtml(item.titulo)}</div>
            ${item.descripcion ? `<div class="item-description">${escapeHtml(item.descripcion)}</div>` : ''}
            ${item.fechaVencimiento ? `<div class="item-date">Fecha límite: ${formatDate(item.fechaVencimiento)}</div>` : ''}
            <button class="item-delete" aria-label="Eliminar elemento ${item.titulo}" title="Eliminar elemento">&times;</button>
        `;

        // Event listeners
        card.querySelector('.item-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`¿Eliminar el elemento "${item.titulo}"?`)) {
                workItems = workItems.filter(w => w.id !== item.id);
                saveItems();
                renderItems();
            }
        });

        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', item.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // Lógica para mover elemento con teclado
                const currentStatus = item.status;
                const statusOrder = ['todo', 'progress', 'done'];
                const currentIndex = statusOrder.indexOf(currentStatus);
                const nextIndex = (currentIndex + 1) % statusOrder.length;
                
                item.status = statusOrder[nextIndex];
                saveItems();
                renderItems();
                
                // Mantener foco
                setTimeout(() => {
                    const newCard = document.querySelector(`[data-id="${item.id}"]`);
                    if (newCard) newCard.focus();
                }, 100);
            }
        });

        return card;
    }

    function renderItems() {
        // Limpiar columnas
        Object.values(columns).forEach(col => {
            if (col) col.innerHTML = '';
        });

        // Renderizar elementos
        workItems.forEach(item => {
            const card = createWorkItem(item);
            if (columns[item.status]) {
                columns[item.status].appendChild(card);
            }
        });

        updateCounters();
    }

    function setupDragAndDrop() {
        Object.entries(columns).forEach(([status, column]) => {
            if (!column) return;

            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.style.backgroundColor = 'rgba(248, 187, 208, 0.1)';
            });

            column.addEventListener('dragleave', (e) => {
                if (!column.contains(e.relatedTarget)) {
                    column.style.backgroundColor = '';
                }
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.style.backgroundColor = '';
                
                const itemId = e.dataTransfer.getData('text/plain');
                const item = workItems.find(w => w.id === itemId);
                
                if (item && item.status !== status) {
                    item.status = status;
                    saveItems();
                    renderItems();
                    
                    // Anunciar cambio para lectores de pantalla
                    announceChange(`Elemento movido a ${getStatusName(status)}`);
                }
            });
        });
    }

    function getStatusName(status) {
        const names = {
            todo: 'Pendientes',
            progress: 'En Progreso',
            done: 'Completados'
        };
        return names[status] || status;
    }

    function announceChange(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'visually-hidden';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    }

    // Setup del formulario
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            
            const tituloInput = form.querySelector('[name="NuevaTarea.Titulo"]');
            const descripcionInput = form.querySelector('[name="NuevaTarea.Descripcion"]');
            const fechaInput = form.querySelector('[name="NuevaTarea.FechaVencimiento"]');
            
            const titulo = tituloInput.value.trim();
            const descripcion = descripcionInput.value.trim();
            const fechaVencimiento = fechaInput.value;
            
            if (!titulo) {
                tituloInput.focus();
                announceChange('Por favor, ingrese un título');
                return;
            }

            const newItem = {
                id: Date.now().toString(),
                titulo,
                descripcion,
                fechaVencimiento,
                status: 'todo',
                createdAt: new Date().toISOString()
            };

            workItems.push(newItem);
            saveItems();
            renderItems();
            form.reset();
            
            announceChange('Nuevo elemento creado exitosamente');
            
            // Enfocar el nuevo elemento
            setTimeout(() => {
                const newCard = document.querySelector(`[data-id="${newItem.id}"]`);
                if (newCard) newCard.focus();
            }, 100);
        });
    }

    // Inicialización
    setupDragAndDrop();
    renderItems();

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    const titleInput = form?.querySelector('[name="NuevaTarea.Titulo"]');
                    if (titleInput) titleInput.focus();
                    break;
            }
        }
    });
});

// Función global para limpiar datos (usada en Privacy)
window.clearLocalData = function() {
    if (confirm('¿Está seguro de que desea eliminar todos los elementos? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('workflowItems');
        localStorage.removeItem('kanbanTasks'); // Compatibilidad con versión anterior
        
        // Recargar página si estamos en el gestor
        if (window.location.pathname.includes('tareways')) {
            window.location.reload();
        } else {
            alert('Datos eliminados correctamente.');
            window.location.href = '/';
        }
    }
};
