import { useEffect, useRef, useState } from 'react';

const Stats = () => {
    const statsRef = useRef(null);
    const [counted, setCounted] = useState(false);
    const [counts, setCounts] = useState({ careers: 0, students: 0, masters: 0, foundation: 0 });

    useEffect(() => {
        const statsSection = statsRef.current;
        if (!statsSection) return;

        const animateCounters = () => {
            const speed = 200;
            const targets = { careers: 4, students: 5000, masters: 3, foundation: 2012 };
            
            const updateCount = (key, target, currentCount) => {
                const inc = target / speed;
                if (currentCount < target) {
                    const nextCount = Math.ceil(currentCount + inc);
                    setCounts(prev => ({ ...prev, [key]: nextCount }));
                    setTimeout(() => updateCount(key, target, nextCount), 15);
                } else {
                    setCounts(prev => ({ ...prev, [key]: target }));
                }
            };

            updateCount('careers', targets.careers, 0);
            updateCount('students', targets.students, 0);
            updateCount('masters', targets.masters, 0);
            updateCount('foundation', targets.foundation, 0);
        };

        const statsObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !counted) {
                animateCounters();
                setCounted(true);
            }
        }, { threshold: 0.5 });
        
        statsObserver.observe(statsSection);

        return () => {
            if (statsSection) statsObserver.unobserve(statsSection);
        };
    }, [counted]);

    return (
        <div className="hero-stats" ref={statsRef}>
            <div className="hero-stat-item reveal">
                <i className="ph ph-student"></i>
                <div className="hero-stat-text">
                    <span className="hero-stat-number">{counts.careers}</span>
                    <span className="hero-stat-label">Carreras</span>
                </div>
            </div>
            <div className="hero-stat-item reveal">
                <i className="ph ph-users"></i>
                <div className="hero-stat-text">
                    <span className="hero-stat-number">+{counts.students}</span>
                    <span className="hero-stat-label">Estudiantes</span>
                </div>
            </div>
            <div className="hero-stat-item reveal">
                <i className="ph ph-certificate"></i>
                <div className="hero-stat-text">
                    <span className="hero-stat-number">{counts.masters}</span>
                    <span className="hero-stat-label">Maestrías</span>
                </div>
            </div>
            <div className="hero-stat-item reveal">
                <i className="ph ph-buildings"></i>
                <div className="hero-stat-text">
                    <span className="hero-stat-number">{counts.foundation}</span>
                    <span className="hero-stat-label">Fundación</span>
                </div>
            </div>
        </div>
    );
};

export default Stats;
