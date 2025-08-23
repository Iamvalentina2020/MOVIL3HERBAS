// Sistema de gestión de elementos de trabajo con interface visual y paginación

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

    // Sistema de paginación
    const ITEMS_PER_PAGE = 4;
    let currentPages = {
        todo: 1,
        progress: 1,
        done: 1
    };

    let workItems = loadItemsFromJSON();

    function loadItemsFromJSON() {
        try {
            const data = localStorage.getItem('workflowItemsJSON');
            if (data) {
                const parsed = JSON.parse(data);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
        return [];
    }

    function saveItemsToJSON() {
        try {
            const jsonData = JSON.stringify(workItems, null, 2);
            localStorage.setItem('workflowItemsJSON', jsonData);
            updateCounters();
        } catch (error) {
            console.error('Error al guardar datos:', error);
        }
    }

    function updateCounters() {
        if (counters.todo) counters.todo.textContent = workItems.filter(item => item.status === 'todo').length;
        if (counters.progress) counters.progress.textContent = workItems.filter(item => item.status === 'progress').length;
        if (counters.done) counters.done.textContent = workItems.filter(item => item.status === 'done').length;
    }

    function getItemsByStatus(status) {
        return workItems.filter(item => item.status === status);
    }

    function getPaginatedItems(status, page = 1) {
        const items = getItemsByStatus(status);
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return items.slice(startIndex, endIndex);
    }

    function getTotalPages(status) {
        const items = getItemsByStatus(status);
        return Math.ceil(items.length / ITEMS_PER_PAGE);
    }

    function createPaginationControls(status) {
        const totalPages = getTotalPages(status);
        const currentPage = currentPages[status];
        
        if (totalPages <= 1) return '';

        let paginationHTML = '<div class="pagination-controls">';
        paginationHTML += `<span class="page-info">Página ${currentPage} de ${totalPages}</span>`;
        
        // Botón anterior
        if (currentPage > 1) {
            paginationHTML += `<button class="page-btn prev-btn" onclick="changePage('${status}', ${currentPage - 1})" aria-label="Página anterior">‹</button>`;
        }
        
        // Números de página
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="page-btn page-number ${activeClass}" onclick="changePage('${status}', ${i})" aria-label="Ir a página ${i}">${i}</button>`;
        }
        
        // Botón siguiente
        if (currentPage < totalPages) {
            paginationHTML += `<button class="page-btn next-btn" onclick="changePage('${status}', ${currentPage + 1})" aria-label="Página siguiente">›</button>`;
        }
        
        paginationHTML += '</div>';
        return paginationHTML;
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
            <div class="item-meta">
                <span class="item-created">Creado: ${formatDateTime(item.createdAt)}</span>
                <span class="item-id">#${item.id.slice(-4)}</span>
            </div>
            <button class="item-delete" aria-label="Eliminar elemento ${item.titulo}" title="Eliminar elemento">&times;</button>
        `;

        // Event listeners
        card.querySelector('.item-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`¿Eliminar el elemento "${item.titulo}"?`)) {
                workItems = workItems.filter(w => w.id !== item.id);
                
                // Ajustar página si es necesaria
                const status = item.status;
                const totalPages = getTotalPages(status);
                if (currentPages[status] > totalPages && totalPages > 0) {
                    currentPages[status] = totalPages;
                }
                
                saveItemsToJSON();
                renderItems();
                announceChange(`Elemento "${item.titulo}" eliminado`);
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
                const currentStatus = item.status;
                const statusOrder = ['todo', 'progress', 'done'];
                const currentIndex = statusOrder.indexOf(currentStatus);
                const nextIndex = (currentIndex + 1) % statusOrder.length;
                
                item.status = statusOrder[nextIndex];
                saveItemsToJSON();
                renderItems();
                announceChange(`Elemento movido a ${getStatusName(item.status)}`);
            }
        });

        return card;
    }

    function renderItems() {
        // Limpiar columnas
        Object.entries(columns).forEach(([status, column]) => {
            if (!column) return;
            
            const paginatedItems = getPaginatedItems(status, currentPages[status]);
            
            // Limpiar contenido
            column.innerHTML = '';
            
            // Renderizar elementos de la página actual
            paginatedItems.forEach(item => {
                const card = createWorkItem(item);
                column.appendChild(card);
            });
            
            // Agregar controles de paginación
            const paginationHTML = createPaginationControls(status);
            if (paginationHTML) {
                column.insertAdjacentHTML('afterend', paginationHTML);
            }
        });

        updateCounters();
        updatePaginationInfo();
    }

    function updatePaginationInfo() {
        Object.keys(columns).forEach(status => {
            const existingPagination = document.querySelector(`[data-status="${status}"] + .pagination-controls`);
            if (existingPagination) {
                existingPagination.remove();
            }
            
            const column = columns[status];
            if (column) {
                const paginationHTML = createPaginationControls(status);
                if (paginationHTML) {
                    column.closest('.workflow-column').insertAdjacentHTML('beforeend', paginationHTML);
                }
            }
        });
    }

    // Función global para cambiar página
    window.changePage = function(status, page) {
        const totalPages = getTotalPages(status);
        if (page < 1 || page > totalPages) return;
        
        currentPages[status] = page;
        renderItems();
        announceChange(`Navegando a página ${page} de ${getStatusName(status)}`);
    };

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
                    const oldStatus = item.status;
                    item.status = status;
                    item.updatedAt = new Date().toISOString();
                    
                    // Reset page for new status
                    currentPages[status] = 1;
                    
                    saveItemsToJSON();
                    renderItems();
                    announceChange(`Elemento movido de ${getStatusName(oldStatus)} a ${getStatusName(status)}`);
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

    function formatDateTime(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
                id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                titulo,
                descripcion,
                fechaVencimiento,
                status: 'todo',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            workItems.push(newItem);
            
            // Reset a página 1 para mostrar el nuevo elemento
            currentPages.todo = 1;
            
            saveItemsToJSON();
            renderItems();
            form.reset();
            
            announceChange('Nuevo elemento creado exitosamente');
            
            // Exportar JSON para debugging (opcional)
            if (window.location.hostname === 'localhost') {
                console.log('Datos actuales:', JSON.stringify(workItems, null, 2));
            }
        });
    }

    // Función para exportar datos JSON
    window.exportDataJSON = function() {
        const dataStr = JSON.stringify(workItems, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `taskflow_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Función para importar datos JSON
    window.importDataJSON = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    if (confirm('¿Desea reemplazar todos los datos actuales con los datos importados?')) {
                        workItems = importedData;
                        // Reset páginas
                        currentPages = { todo: 1, progress: 1, done: 1 };
                        saveItemsToJSON();
                        renderItems();
                        announceChange('Datos importados exitosamente');
                    }
                } else {
                    alert('El archivo no contiene datos válidos');
                }
            } catch (error) {
                alert('Error al importar archivo: ' + error.message);
            }
        };
        reader.readAsText(file);
    };

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
                case 'e':
                    e.preventDefault();
                    exportDataJSON();
                    break;
            }
        }
    });
});

// Función global para limpiar datos (usada en Privacy)
window.clearLocalData = function() {
    if (confirm('¿Está seguro de que desea eliminar todos los elementos? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('workflowItemsJSON');
        localStorage.removeItem('workflowItems'); // Compatibilidad con versión anterior
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
