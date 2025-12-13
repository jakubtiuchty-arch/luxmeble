/**
 * LUX-MEBLE Landing Page JavaScript
 * Premium furniture manufacturer from Trzebnica
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavbar();
    initMobileMenu();
    initSmoothScroll();
    initCounterAnimation();
    initTestimonialsSlider();
    initGalleryFilter();
    initContactForm();
    initScrollAnimations();
    initTypewriter();
    initZabudujButton();
});

/**
 * Typewriter effect for hero accent text
 */
function initTypewriter() {
    const element = document.querySelector('.title-accent');
    if (!element) return;

    const text = element.textContent;
    element.textContent = '';
    element.style.visibility = 'visible';

    let index = 0;
    const speed = 80;

    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }

    setTimeout(type, 800);
}

/**
 * ZABUDUJ button - smooth image transition
 */
function initZabudujButton() {
    const btn = document.getElementById('zabuduj-btn');
    if (!btn) return;

    const heroBg1 = document.querySelector('.hero-bg-1');
    const heroBg2 = document.querySelector('.hero-bg-2');
    const heroImg1 = document.querySelector('.hero-img-1');
    const heroImg2 = document.querySelector('.hero-img-2');

    let isToggled = false;

    btn.addEventListener('click', function() {
        isToggled = !isToggled;

        if (isToggled) {
            // Show second image (zabudowane)
            if (heroBg1) heroBg1.classList.remove('active');
            if (heroBg2) heroBg2.classList.add('active');
            if (heroImg1) heroImg1.classList.remove('active');
            if (heroImg2) heroImg2.classList.add('active');
            btn.classList.add('toggled');
        } else {
            // Show first image (original)
            if (heroBg1) heroBg1.classList.add('active');
            if (heroBg2) heroBg2.classList.remove('active');
            if (heroImg1) heroImg1.classList.add('active');
            if (heroImg2) heroImg2.classList.remove('active');
            btn.classList.remove('toggled');
        }
    });
}

/**
 * Navbar scroll effect
 */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    let lastScrollTop = 0;

    function handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScrollTop = scrollTop;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
}

/**
 * Mobile menu toggle
 */
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!hamburger || !navMenu) return;

    function setMenuOpen(isOpen) {
        hamburger.classList.toggle('active', isOpen);
        navMenu.classList.toggle('active', isOpen);
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        hamburger.setAttribute('aria-label', isOpen ? 'Zamknij menu' : 'Otwórz menu');
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    hamburger.addEventListener('click', function() {
        setMenuOpen(!navMenu.classList.contains('active'));
    });

    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            setMenuOpen(false);
        });
    });

    // Close menu on outside click
    document.addEventListener('click', function(e) {
        if (!navMenu.classList.contains('active')) return;
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            setMenuOpen(false);
        }
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            setMenuOpen(false);
            hamburger.focus();
        }
    });
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Counter animation for statistics
 */
function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number');
    const speed = 200;
    let animated = false;

    function animateCounters() {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const increment = target / speed;

            function updateCount() {
                const current = +counter.innerText;
                if (current < target) {
                    counter.innerText = Math.ceil(current + increment);
                    setTimeout(updateCount, 10);
                } else {
                    counter.innerText = target;
                }
            }

            updateCount();
        });
    }

    // Trigger animation when stats section is visible
    const statsSection = document.querySelector('.hero-stats');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !animated) {
                    animated = true;
                    animateCounters();
                }
            });
        }, { threshold: 0.5 });

        observer.observe(statsSection);
    }
}

/**
 * Testimonials slider
 */
function initTestimonialsSlider() {
    const cards = document.querySelectorAll('.testimonial-card');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.testimonial-nav-btn.prev');
    const nextBtn = document.querySelector('.testimonial-nav-btn.next');
    let currentIndex = 0;
    let autoSlideInterval;

    function showSlide(index) {
        // Handle wrap around
        if (index >= cards.length) index = 0;
        if (index < 0) index = cards.length - 1;

        currentIndex = index;

        // Update cards
        cards.forEach((card, i) => {
            card.classList.remove('active');
            if (i === currentIndex) {
                card.classList.add('active');
            }
        });

        // Update dots
        dots.forEach((dot, i) => {
            dot.classList.remove('active');
            if (i === currentIndex) {
                dot.classList.add('active');
            }
        });
    }

    function nextSlide() {
        showSlide(currentIndex + 1);
    }

    function prevSlide() {
        showSlide(currentIndex - 1);
    }

    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 5000);
    }

    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }

    // Event listeners
    if (nextBtn) nextBtn.addEventListener('click', () => {
        stopAutoSlide();
        nextSlide();
        startAutoSlide();
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
        stopAutoSlide();
        prevSlide();
        startAutoSlide();
    });

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            stopAutoSlide();
            showSlide(index);
            startAutoSlide();
        });
    });

    // Start auto slide
    startAutoSlide();

    // Pause on hover
    const slider = document.querySelector('.testimonials-slider');
    if (slider) {
        slider.addEventListener('mouseenter', stopAutoSlide);
        slider.addEventListener('mouseleave', startAutoSlide);
    }
}

/**
 * Gallery filter functionality
 */
function initGalleryFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');

            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Filter items
            galleryItems.forEach(item => {
                const category = item.getAttribute('data-category');

                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                    item.style.animation = 'fadeIn 0.5s ease forwards';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

/**
 * Contact form handling
 */
function initContactForm() {
    const form = document.getElementById('contact-form');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            // Basic validation
            if (!data.name || !data.email) {
                showNotification('Proszę wypełnić wymagane pola', 'error');
                return;
            }

            if (!isValidEmail(data.email)) {
                showNotification('Proszę podać poprawny adres email', 'error');
                return;
            }

            // Simulate form submission (replace with actual API call)
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Wysyłanie...</span>';
            submitBtn.disabled = true;

            setTimeout(() => {
                showNotification('Dziękujemy! Wiadomość została wysłana. Skontaktujemy się wkrótce.', 'success');
                form.reset();
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 1500);
        });
    }
}

/**
 * Email validation helper
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Show notification
 */
function showNotification(message, type = 'success') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 20px 30px;
        background: ${type === 'success' ? 'rgba(39, 201, 63, 0.95)' : 'rgba(201, 39, 39, 0.95)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideIn 0.3s ease forwards;
        font-family: var(--font-body);
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Close button handler
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    `;
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

/**
 * Scroll animations using Intersection Observer
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.service-card, .about-feature, .process-step, .gallery-item');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });
}

/**
 * Particle effect for hero section
 */
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        createParticle(container);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    const size = Math.random() * 4 + 1;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const duration = Math.random() * 20 + 10;
    const delay = Math.random() * 5;
    const opacity = Math.random() * 0.3 + 0.1;

    particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: rgba(214, 32, 39, ${opacity});
        border-radius: 50%;
        left: ${x}%;
        top: ${y}%;
        pointer-events: none;
        animation: float ${duration}s ease-in-out ${delay}s infinite;
    `;

    // Add float animation
    if (!document.querySelector('#particle-animation')) {
        const style = document.createElement('style');
        style.id = 'particle-animation';
        style.textContent = `
            @keyframes float {
                0%, 100% {
                    transform: translateY(0) translateX(0);
                    opacity: var(--particle-opacity, 0.2);
                }
                25% {
                    transform: translateY(-30px) translateX(10px);
                }
                50% {
                    transform: translateY(-15px) translateX(-10px);
                    opacity: calc(var(--particle-opacity, 0.2) * 1.5);
                }
                75% {
                    transform: translateY(-40px) translateX(5px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(particle);
}

/**
 * Active navigation link highlight
 */
function initActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function highlightNav() {
        const scrollPos = window.scrollY + 150;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNav, { passive: true });
    highlightNav(); // Initial highlight
}

// Initialize active navigation
initActiveNavigation();

/**
 * Parallax effect on scroll
 */
// Parallax was removed (hero uses real images, not background-position)

/**
 * Preloader (optional - add preloader HTML if needed)
 */
window.addEventListener('load', function() {
    document.body.classList.add('loaded');

    // Hide preloader if exists
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }
});
