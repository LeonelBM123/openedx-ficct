document.addEventListener('DOMContentLoaded', () => {
    const data = window.planData || [];
    const pdfLinks = window.pdfLinks || {};
    const wrapper = document.getElementById('semestersWrapper');
    const svgLayer = document.getElementById('connectionsLayer');

    // Parse data to group by semester
    const levelsMap = {};
    const siglaToNode = {}; // Para encontrar rápido la data por sigla

    data.forEach(item => {
        // Normalizar los niveles para agrupar (e.g. "1er. SEMESTRE" -> 1)
        // O simplemente usar el label text literal pero ordenarlo 
        const levelLabel = item.nivel || 'OTROS';
        if (!levelsMap[levelLabel]) {
            levelsMap[levelLabel] = [];
        }
        
        // Limpiamos la sigla si existe
        if(item.sigla) {
            item.sigla = item.sigla.trim();
            // Guardamos referencias
            siglaToNode[item.sigla] = item;
        }

        // Limpiar prerrequisitos y convertirlos en array
        if(item.prerequisitos) {
            item.prereqList = item.prerequisitos.split('|').map(p => p.trim()).filter(p => p !== '');
        } else {
            item.prereqList = [];
        }

        levelsMap[levelLabel].push(item);
    });

    // Populate postrequisitos (quién me necesita a mí)
    Object.values(siglaToNode).forEach(item => {
        item.postreqList = [];
    });
    Object.values(siglaToNode).forEach(item => {
        item.prereqList.forEach(prereqSigla => {
            if (siglaToNode[prereqSigla]) {
                siglaToNode[prereqSigla].postreqList.push(item.sigla);
            }
        });
    });

    // Render Grid
    let columnCounter = 1;

    // Ordered levels (Assuming data appears ordered mostly, but we iterate map keys)
    Object.keys(levelsMap).forEach(levelName => {
        const colDiv = document.createElement('div');
        colDiv.className = 'semester-col';
        
        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'semester-header';
        
        let numStr = levelName.match(/\d+/);
        let num = numStr ? numStr[0] : (columnCounter > 9 ? 'G' : columnCounter);
        
        headerDiv.innerHTML = `
            <span class="num">${num}</span>
            <span class="text">${levelName.replace(/\d+.*SEMESTRE/, 'SEMESTRE')}</span>
        `;
        colDiv.appendChild(headerDiv);

        // Subjects
        levelsMap[levelName].forEach(subject => {
            const card = document.createElement('div');
            card.className = 'subject-card';
            card.dataset.sigla = subject.sigla || '';
            
            // Check if elective
            let isElective = (subject.nombre_materia.indexOf('ELECTIVA') !== -1 || subject.nombre_materia.indexOf('OPTATIVA') !== -1);
            let tagHTML = isElective ? '<span class="electiva-tag">ELECTIVA</span>' : '';
            
            let pdfHTML = '';
            if (subject.sigla && pdfLinks[subject.sigla]) {
                pdfHTML = `
                <div class="subject-pdf-actions">
                    <a href="${pdfLinks[subject.sigla]}" target="_blank" class="btn-pdf" title="Abrir PDF">
                        <i class="ph ph-file-pdf"></i> Prog. Analítico
                    </a>
                </div>`;
            }

            card.innerHTML = `
                ${tagHTML}
                <div class="sigla">${subject.sigla || ''}</div>
                <div class="name">${subject.nombre_materia}</div>
                ${pdfHTML}
            `;
            
            // Hover events
            card.addEventListener('mouseenter', () => handleSubjectHover(subject.sigla));
            card.addEventListener('mouseleave', () => clearHighlighting());
            
            // Click to lock selection (optional enhancement)
            card.addEventListener('click', () => {
                if(card.classList.contains('is-locked')) {
                    document.querySelectorAll('.subject-card').forEach(el => el.classList.remove('is-locked'));
                    clearHighlighting();
                } else {
                    document.querySelectorAll('.subject-card').forEach(el => el.classList.remove('is-locked'));
                    card.classList.add('is-locked');
                    handleSubjectHover(subject.sigla);
                }
            });

            colDiv.appendChild(card);
        });

        wrapper.appendChild(colDiv);
        columnCounter++;
    });

    // Interactions and Drawing logic
    let currentLocked = null;

    function handleSubjectHover(hoveredSigla) {
        if (!hoveredSigla) return;
        
        const lockedCard = document.querySelector('.subject-card.is-locked');
        if(lockedCard && lockedCard.dataset.sigla !== hoveredSigla) {
            // Hovering over while something else is locked -> ignore or update? Let's ignore to keep lock.
            return; 
        }

        const subjectData = siglaToNode[hoveredSigla];
        if (!subjectData) return;

        const allCards = document.querySelectorAll('.subject-card');
        allCards.forEach(card => {
            card.classList.remove('is-active', 'is-prereq', 'is-postreq', 'dimmed');
            card.classList.add('dimmed'); // Dim all first
        });

        // Activate hovered
        const hoveredCard = getCardBySigla(hoveredSigla);
        if (hoveredCard) {
            hoveredCard.classList.remove('dimmed');
            hoveredCard.classList.add('is-active');
        }

        // Activate Prereqs
        const prereqCards = [];
        subjectData.prereqList.forEach(p => {
            const pCard = getCardBySigla(p);
            if (pCard) {
                pCard.classList.remove('dimmed');
                pCard.classList.add('is-prereq');
                prereqCards.push(pCard);
            }
        });

        // Activate Postreqs
        const postreqCards = [];
        subjectData.postreqList.forEach(p => {
            const pCard = getCardBySigla(p);
            if (pCard) {
                pCard.classList.remove('dimmed');
                pCard.classList.add('is-postreq');
                postreqCards.push(pCard);
            }
        });

        // Calculate and Draw Lines
        drawConnections(hoveredCard, prereqCards, postreqCards);
    }

    function clearHighlighting() {
        const lockedCard = document.querySelector('.subject-card.is-locked');
        if (lockedCard) return; // Keep highlighting if locked

        document.querySelectorAll('.subject-card').forEach(card => {
            card.classList.remove('is-active', 'is-prereq', 'is-postreq', 'dimmed');
        });
        svgLayer.innerHTML = '';
    }

    function getCardBySigla(sigla) {
        return document.querySelector(`.subject-card[data-sigla="${sigla}"]`);
    }

    function drawConnections(centerCard, prereqs, postreqs) {
        svgLayer.innerHTML = '';
        if (!centerCard) return;

        // Ensure SVGLayer matches geometry of scrollable container
        // Actually, svgLayer is position:absolute inside grid-container, which has overflow.
        // Its size needs to cover the scrollWidth.
        const cRect = centerCard.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        // Helper to get coordinates relative to the SVG wrapper
        // The SVG needs to be as large as the wrapper scroll area.
        svgLayer.style.width = wrapper.scrollWidth + 'px';
        svgLayer.style.height = wrapper.scrollHeight + 'px';

        const svgRect = svgLayer.getBoundingClientRect();

        function getAnchor(element, type) {
            const rect = element.getBoundingClientRect();
            // type "right" -> point from right edge of PREREQ
            // type "left" -> point from left edge of POSTREQ/CENTER
            const xOffset = rect.left - svgRect.left;
            const yOffset = rect.top - svgRect.top;
            
            if (type === 'left') {
                return { x: xOffset, y: yOffset + rect.height / 2 };
            } else if (type === 'right') {
                return { x: xOffset + rect.width, y: yOffset + rect.height / 2 };
            }
        }

        const addBezier = (p1, p2, color) => {
            // Cubic bezier with horizontal handles
            const cX = (p1.x + p2.x) / 2;
            const d = `M ${p1.x} ${p1.y} C ${cX} ${p1.y}, ${cX} ${p2.y}, ${p2.x} ${p2.y}`;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', '2');
            svgLayer.appendChild(path);
        };

        const centerAnchorLeft = getAnchor(centerCard, 'left');
        const centerAnchorRight = getAnchor(centerCard, 'right');

        // Draw PREREQ to CENTER (Color Red)
        prereqs.forEach(pre => {
            const pAnchor = getAnchor(pre, 'right');
            addBezier(pAnchor, centerAnchorLeft, 'var(--secondary)');
        });

        // Draw CENTER to POSTREQ (Color Green)
        postreqs.forEach(post => {
            const pAnchor = getAnchor(post, 'left');
            addBezier(centerAnchorRight, pAnchor, 'var(--success)');
        });
    }

    // Refresh connections on resize or scroll is complex, but mostly absolute positioning inside relative handles it.
    // However, window resize might change positions.
    window.addEventListener('resize', () => {
        const lockedCard = document.querySelector('.subject-card.is-locked');
        if (lockedCard) {
            handleSubjectHover(lockedCard.dataset.sigla);
        }
    });
});
