// Shidy's Fit - Main Logic

// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
// Ve a tu proyecto en Supabase -> Project Settings -> API
// Copia aquí tu "Project URL" y tu "anon public key"
const supabaseUrl = 'https://uxnzsgijsexukacnleuv.supabase.co';
const supabaseKey = 'sb_publishable_ViK55IUVr-jZ0qOI-g8tSg_EhlzRmgl';

// CONFIGURACIÓN DE URL (Producción vs Local)
const IS_PRODUCTION = false; // <-- CAMBIAR A 'true' CUANDO DESPLIEGUES EL BACKEND
const BACKEND_URL = IS_PRODUCTION ? 'https://tu-aplicacion-backend.onrender.com' : 'http://localhost:4242';
const STRIPE_PRICE_ID = 'price_1TFWbCD1rba89JLrgUakDKKv';

// Variables y estado global
let supabaseClient = null;
let isRegisterMode = false;
let currentUser = null;
let currentUserProfile = null; // Para guardar el rol y otros datos del perfil
let deferredPrompt; // Para la instalación PWA

// Verificación de protocolo para PWA
if (window.location.protocol === 'file:') {
    console.warn('⚠️ ATENCIÓN: Estás abriendo el archivo HTML directamente (file://). Las funciones de PWA (Instalación, Caché) NO funcionarán. Debes usar un servidor local (Live Server o similares).');
}

// Verifica si existe 'supabase' desde el CDN y si has puesto tus claves
if (typeof window.supabase !== 'undefined' && supabaseUrl !== 'TU_SUPABASE_URL') {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase Client Initialized!');
    
    // Configurar listener para saber si el usuario entra o sale de su cuenta
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔔 Auth Event:', event);
        currentUser = session?.user || null;
        
        // Actualizamos la UI básica inmediatamente
        updateUIWithAuthState();

        if (currentUser) {
            // Cargar el perfil de forma asíncrona sin bloquear el hilo principal
            (async () => {
                try {
                    const { data, error } = await supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('id', currentUser.id)
                        .maybeSingle(); 
                    
                    if (error) {
                        console.warn('⚠️ Perfil no encontrado o error:', error.message);
                    }
                    if (data) {
                        console.log('👤 Perfil cargado:', data.username, '| Rol:', data.role);
                        currentUserProfile = data;
                        updateUIWithAuthState();
                    }
                } catch (err) {
                    console.error('❌ Error crítico cargando perfil:', err);
                }
            })();
        } else {
            currentUserProfile = null;
        }

        // Redirección inmediata si el usuario acaba de entrar
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            const currentHash = window.location.hash;
            if (currentHash === '#login' && currentUser) {
                navigate('home');
            }
        }
    });

} else {
    console.warn('⚠️ Supabase no está configurado aún. Añade tu URL y KEY en app.js');
}

// ==========================================
// ROUTINES DATA & LOGIC
// ==========================================
const plansData = {
    beginner: {
        title: "Principiante: Construyendo la Base",
        color: "text-neon",
        borderColor: "border-neon",
        bgHover: "hover:bg-neon/5",
        description: "3 series de 12-15 repeticiones. Descanso: 90s. Enfoque en máquinas guiadas.",
        days: [
            { day: "Día 1", focus: "Pecho/Tríceps", exercises: ["Press de pecho en máquina", "Peck Deck", "Extensiones de tríceps en polea"] },
            { day: "Día 2", focus: "Espalda/Bíceps", exercises: ["Jalón al pecho", "Remo en máquina sentado", "Curl con mancuernas"] },
            { day: "Día 3", focus: "Piernas", exercises: ["Prensa de piernas", "Extensión de cuádriceps", "Curl de isquios en máquina"] },
            { day: "Día 4", focus: "Hombros/Core", exercises: ["Press militar en máquina", "Elevaciones laterales ligeras", "Plancha abdominal (3x30s)"] },
            { day: "Día 5", focus: "Full Body Suave", exercises: ["30 min caminata inclinada", "Circuito básico de máquinas a intensidad muy baja"] }
        ]
    },
    intermediate: {
        title: "Intermedio: Fuerza e Hipertrofia",
        color: "text-brand",
        borderColor: "border-brand",
        bgHover: "hover:bg-brand/5",
        description: "3-4 series de 8-12 reps (6-8 reps en compuesto). Descanso: 60-90s. Foco en pesos libres.",
        days: [
            { day: "Día 1", focus: "Empuje", exercises: ["Press de banca barra", "Press inclinado mancuernas", "Elevaciones laterales", "Fondos tríceps"] },
            { day: "Día 2", focus: "Tirón", exercises: ["Dominadas o jalón pesado", "Remo barra", "Face pull", "Curl barra Z"] },
            { day: "Día 3", focus: "Piernas", exercises: ["Sentadillas barra", "Peso muerto rumano", "Zancadas", "Gemelos"] },
            { day: "Día 4", focus: "Torso", exercises: ["Press militar mancuernas", "Press pecho máquina", "Jalón al pecho", "Curl martillo"] },
            { day: "Día 5", focus: "Piernas (Glúteo/Isquio)", exercises: ["Hip thrust pesado", "Prensa una pierna", "Curl femoral tumbado", "Gemelos sentados"] }
        ]
    },
    advanced: {
        title: "Avanzado: Máximo Desarrollo",
        color: "text-orange-500",
        borderColor: "border-orange-500",
        bgHover: "hover:bg-orange-500/5",
        description: "Bro Split. 4-5 series. Compuestos pesados (4-6 reps) y aislamiento al fallo (12-15 reps). Descansos variables.",
        days: [
            { day: "Día 1", focus: "Pecho/Abdomen", exercises: ["Press banca pesado", "Press inclinado multipower", "Cruces polea", "Superserie Crunches/Elevación piernas"] },
            { day: "Día 2", focus: "Espalda/Lumbares", exercises: ["Peso muerto clásico", "Dominadas lastradas", "Remo barra T", "Pull-over polea"] },
            { day: "Día 3", focus: "Cuádriceps/Gemelos", exercises: ["Sentadilla libre pesada", "Prensa (Drop set)", "Extensiones (pausa arriba)", "Gemelos pie pesados"] },
            { day: "Día 4", focus: "Hombros/Trapecios", exercises: ["Press militar barra pie", "Elevaciones laterales polea", "Pájaros mancuerna", "Encogimientos pesados"] },
            { day: "Día 5", focus: "Brazos (Superseries)", exercises: ["Curl barra + Press francés", "Curl Scott + Extensiones polea cuerda"] }
        ]
    }
};

function selectRoutineLevel(level, elementCard) {
    if (!elementCard) {
        elementCard = document.querySelector(`[data-level="${level}"]`);
    }

    // Reset all cards styling
    document.querySelectorAll('.js-level-card').forEach(card => {
        card.classList.remove('border-neon', 'border-brand', 'border-orange-500', 'opacity-100', 'shadow-[0_0_20px_rgba(255,51,102,0.3)]', 'shadow-[0_0_20px_rgba(0,240,255,0.3)]', 'shadow-[0_0_20px_rgba(249,115,22,0.3)]', 'bg-dark-800');
        card.classList.add('border-dark-800', 'opacity-70');
    });

    // Apply active styling to the selected card
    if (elementCard) {
        elementCard.classList.remove('border-dark-800', 'opacity-70');
        elementCard.classList.add('opacity-100', 'bg-dark-800');
        
        if(level === 'beginner') elementCard.classList.add('border-neon', 'shadow-[0_0_20px_rgba(0,240,255,0.3)]');
        if(level === 'intermediate') elementCard.classList.add('border-brand', 'shadow-[0_0_20px_rgba(255,51,102,0.3)]');
        if(level === 'advanced') elementCard.classList.add('border-orange-500', 'shadow-[0_0_20px_rgba(249,115,22,0.3)]');
    }

    // Render 5-day plan
    const data = plansData[level];
    if (!data) return;

    const container = document.getElementById('routine-details-container');
    if (!container) return;
    
    // Auto-open first day
    let daysHTML = data.days.map((d, i) => `
        <div class="mb-3 border border-white/5 rounded-xl overflow-hidden bg-dark-900 group ${data.bgHover} transition-colors">
            <div class="p-4 md:p-5 flex justify-between items-center cursor-pointer" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('i.fa-chevron-down').classList.toggle('rotate-180')">
                <div>
                    <span class="text-sm font-bold ${data.color} tracking-widest uppercase mr-3">${d.day}</span>
                    <span class="text-white font-medium">${d.focus}</span>
                </div>
                <i class="fa-solid fa-chevron-down text-gray-500 transition-transform duration-300 ${i === 0 ? 'rotate-180' : ''} group-hover:text-white"></i>
            </div>
            <div class="px-5 pb-5 pt-0 ${i === 0 ? '' : 'hidden'} border-t border-white/5 mt-2">
                <ul class="space-y-3 mt-4">
                    ${d.exercises.map(ex => `
                        <li class="flex items-start text-gray-300 text-sm">
                            <i class="fa-solid fa-dumbbell mt-1 mr-3 opacity-50 ${data.color}"></i>
                            ${ex}
                        </li>
                    `).join('')}
                </ul>
                <button onclick="startWorkout('${level}', ${i})" class="mt-6 w-full py-3 rounded-lg border border-white/10 text-white text-xs font-bold uppercase tracking-widest hover:border-white/30 hover:${data.color} hover:bg-white/5 transition-all">Iniciar Entrenamiento</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="mb-8 fade-in flex flex-col md:flex-row md:items-center justify-between">
            <div>
                <h3 class="text-3xl font-heading font-bold text-white uppercase italic mb-2">${data.title}</h3>
                <p class="text-gray-400 text-sm flex items-center"><i class="fa-solid fa-circle-info mr-2 ${data.color}"></i> ${data.description}</p>
            </div>
        </div>
        <div class="space-y-2 fade-in">
            ${daysHTML}
        </div>
    `;
}
document.addEventListener('DOMContentLoaded', () => {
    // Initialize first view
    navigate(window.location.hash ? window.location.hash.substring(1) : 'home');

    // Configurar listener para actualizar la vista activa con cambios de hash
    window.addEventListener('hashchange', () => {
        const viewId = window.location.hash.substring(1) || 'home';
        navigate(viewId);
    });

    // Leer estado inicial de sesión
    if (supabaseClient) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            currentUser = session?.user || null;
            updateUIWithAuthState();
        });
    }

    // Setup mobile menu
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('main-nav');
        if (window.scrollY > 50) {
            nav.classList.add('bg-dark-900/95');
            nav.classList.remove('py-4', 'bg-dark-900/40');
            nav.classList.add('py-2', 'shadow-2xl');
        } else {
            nav.classList.remove('bg-dark-900/95', 'shadow-2xl');
            nav.classList.add('py-4');
            nav.classList.remove('py-2');
        }
    });
});

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
}

// Simple SPA Navigation logic
function navigate(viewId) {
    const mainContent = document.getElementById('main-content');
    
    // Si es un hash de retorno de Stripe con parámetros, extraemos solo el viewId real
    // (Ej: success?session_id=... -> nos quedamos con success)
    const cleanViewId = viewId.split('?')[0];

    // Ignorar hashes técnicos de Stripe que ya maneja handlePaymentRedirects
    if (cleanViewId === 'success' || cleanViewId === 'cancelled') {
        return; 
    }

    const template = document.getElementById(`tpl-${cleanViewId}`);

    if (!template) {
        console.error(`View template tpl-${cleanViewId} not found`);
        return;
    }

    // Smooth Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Wait a tiny bit for UI update
    setTimeout(() => {
        // Inject content
        mainContent.innerHTML = '';
        const clone = template.content.cloneNode(true);

        // Wrap in fade-in container
        const container = document.createElement('div');
        container.className = 'fade-in w-full';
        container.appendChild(clone);
        mainContent.appendChild(container);

        // Update active nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('text-brand');
            link.classList.add('text-gray-300');

            // Highlight active visually replacing text color
            if (link.getAttribute('href') === `#${viewId}`) {
                link.classList.remove('text-gray-300');
                link.classList.add('text-brand');
            }
        });

        // Initialize view-specific logic
        if (viewId === 'chat') {
            initChat();
        } else if (viewId === 'routines') {
            initRoutines();
        } else if (viewId === 'login') {
            initLogin();
        } else if (viewId === 'workout') {
            initWorkout();
        } else if (viewId === 'classes') {
            initClasses();
        } else if (viewId === 'profile') {
            initProfile();
        } else if (viewId === 'admin') {
            initAdmin();
        }
    }, 50); // slight delay for visual cleanliness
}

// LÓGICA DE SUSCRIPCIÓN (STRIPE)
async function handleSubscription() {
    if (!currentUser) {
        navigate('login');
        return;
    }

    const btn = event?.target || document.querySelector('[onclick="handleSubscription()"]');
    const originalHTML = btn ? btn.innerHTML : 'Suscribirse';
    
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Redirigiendo...';
        btn.classList.add('pointer-events-none', 'opacity-70');
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/checkout/create-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                priceId: STRIPE_PRICE_ID,
                mode: 'subscription',
                concept: 'Cuota Mensual Shidy\'s Fit'
            })
        });

        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            // Mostrar el detalle real del error del servidor si existe
            const errorMsg = data.details || data.error || 'Error al crear sesión de pago';
            throw new Error(errorMsg);
        }
    } catch (err) {
        console.error('❌ Error en suscripción:', err);
        // Si el error es "Failed to fetch", es que el servidor backend no está corriendo.
        if (err.message === 'Failed to fetch') {
            alert('❌ ERROR: No se pudo conectar con el servidor backend (puerto 4242). Asegúrate de que has ejecutado "npm start" en la carpeta backend.');
        } else {
            alert('⚠️ Error en la pasarela de pagos: ' + err.message);
        }
        
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.classList.remove('pointer-events-none', 'opacity-70');
        }
    }
}

async function handlePortal() {
    if (!currentUser) return;

    const btn = event?.target || document.querySelector('[onclick="handlePortal()"]');
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Cargando Portal...';
        btn.classList.add('pointer-events-none', 'opacity-70');
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/checkout/create-portal-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });

        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error(data.details || data.error || 'Error al abrir el portal');
        }
    } catch (err) {
        console.error('❌ Error en Portal:', err);
        alert('ℹ️ ' + err.message);
        if (btn) {
            btn.innerHTML = 'Gestionar en Stripe';
            btn.classList.remove('pointer-events-none', 'opacity-70');
        }
    }
}

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================

// Actualiza botones del menú dependiendo de si estás logueado o no
function updateUIWithAuthState() {
    const desktopBtn = document.getElementById('auth-btn-desktop');
    const mobileBtn = document.getElementById('auth-btn-mobile');
    const adminLink = document.getElementById('admin-nav-link');
    const adminLinkMobile = document.getElementById('admin-nav-link-mobile');
    
    const username = currentUserProfile?.username;
    const text = currentUser ? `👤 ${username || 'MI PERFIL'}` : 'ÚNETE';
    
    if (desktopBtn) {
        desktopBtn.innerHTML = text;
        desktopBtn.onclick = () => handleProfileClick();
    }
    if (mobileBtn) {
        mobileBtn.innerHTML = text;
        mobileBtn.onclick = () => handleProfileClick();
    }

    // Mostrar/Ocultar link de Admin
    const isAdmin = currentUserProfile?.role === 'admin';
    console.log('🛡️ Is Admin?', isAdmin, '| Role:', currentUserProfile?.role);
    
    if (adminLink) adminLink.classList.toggle('hidden', !isAdmin);
    if (adminLinkMobile) adminLinkMobile.classList.toggle('hidden', !isAdmin);

    // Actualizar Peso en el Perfil si existe el slider
    if (currentUserProfile?.last_weight) {
        const weightSlider = document.getElementById('profile-weight-slider');
        const weightVal = document.getElementById('profile-weight-val');
        if (weightSlider) weightSlider.value = currentUserProfile.last_weight;
        if (weightVal) weightVal.innerText = currentUserProfile.last_weight;
    }
}

function handleProfileClick() {
    if (currentUser) {
        navigate('profile');
    } else {
        navigate('login');
    }
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
}

function initLogin() {
    // Restauramos el estado visual por defecto
    const form = document.getElementById('auth-form');
    const submitBtn = document.getElementById('auth-submit-btn');
    const logoutBtn = document.getElementById('auth-logout-btn');
    const toggleSection = document.getElementById('auth-toggle-section');
    const successMsg = document.getElementById('auth-success-msg');
    const errorMsg = document.getElementById('auth-error-msg');
    
    if (!form) return;
    
    errorMsg.classList.add('hidden');
    successMsg.classList.add('hidden');
    
    if (currentUser) {
        // Estás logueado, muestra botón de Logout y oculta los inputs
        form.querySelector('div').classList.add('hidden'); // Oculta email
        form.querySelectorAll('div')[1].classList.add('hidden'); // Oculta password
        submitBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        toggleSection.classList.add('hidden');
        
        document.getElementById('auth-title').innerText = 'Tu Perfil';
        document.getElementById('auth-subtitle').innerText = `Sesión activa como: ${currentUser.email}`;
    } else {
        // No logueado, muestra inputs normales
        // Mantiene el modo actual de isRegisterMode
        setAuthMode(isRegisterMode); 
        logoutBtn.classList.add('hidden');
    }
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    setAuthMode(isRegisterMode);
}

function setAuthMode(isRegister) {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtnSpan = document.querySelector('#auth-submit-btn span');
    const toggleText = document.querySelector('#auth-toggle-section p');
    const forgotMsg = document.getElementById('auth-forgot');
    
    document.getElementById('auth-error-msg').classList.add('hidden');
    document.getElementById('auth-success-msg').classList.add('hidden');

    if (isRegister) {
        title.innerText = 'Crea tu cuenta';
        subtitle.innerText = 'Únete al selecto grupo del fitness de élite.';
        submitBtnSpan.innerText = 'Regístrate';
        forgotMsg.classList.add('hidden');
        toggleText.innerHTML = '¿Ya tienes cuenta? <button type="button" onclick="toggleAuthMode()" class="text-white hover:text-brand font-bold uppercase tracking-wide transition-colors">Inicia sesión</button>';
    } else {
        title.innerText = 'Iniciar Sesión';
        subtitle.innerText = 'Bienvenido de nuevo a la élite.';
        submitBtnSpan.innerText = 'Entrar';
        forgotMsg.classList.remove('hidden');
        toggleText.innerHTML = '¿No tienes cuenta? <button type="button" onclick="toggleAuthMode()" class="text-white hover:text-brand font-bold uppercase tracking-wide transition-colors">Regístrate</button>';
    }
}

async function handleAuth(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showAuthError('Error de servidor. Revisa tu consola.');
        return;
    }

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const btn = document.getElementById('auth-submit-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
    document.getElementById('auth-error-msg').classList.add('hidden');
    document.getElementById('auth-success-msg').classList.add('hidden');

    try {
        if (isRegisterMode) {
            // REGISTRO
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });
            if (error) throw error;
            
            showAuthSuccess('¡Cuenta creada! Mira tu email por si requiere confirmación o intenta iniciar sesión.');
            setTimeout(() => toggleAuthMode(), 2000); // Volver a modo login
            
        } else {
            // LOGIN
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
            
            // Redirección se maneja en el onAuthStateChange
        }
    } catch (e) {
        console.error('Login/Register Error:', e);
        showAuthError(e.message || 'Error al autenticarse. Revisa tus credenciales.');
    } finally {
        btn.innerHTML = originalText;
    }
}

async function handleLogout() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    navigate('home');
}

function showAuthError(msg) {
    const errorBox = document.getElementById('auth-error-msg');
    document.getElementById('auth-error-text').innerText = msg;
    errorBox.classList.remove('hidden');
}

function showAuthSuccess(msg) {
    const successBox = document.getElementById('auth-success-msg');
    document.getElementById('auth-success-text').innerText = msg;
    successBox.classList.remove('hidden');
}

// ==========================================

let currentChannelId = null;
let chatSubscription = null;

async function initChat() {
    // Aseguramos que el contenedor hace scroll inferior si hay cosas ya
    const chatBox = document.getElementById('chat-messages');
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    
    if (!supabaseClient) return;

    // Para evitar suscripciones dobles al entrar y salir de la vista
    if (chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
        chatSubscription = null;
    }

    // Asegurarse de que chatBox muestre algo de carga
    if (chatBox) {
        chatBox.innerHTML = '<div class="text-center text-gray-500 py-10"><i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand mb-2"></i><br>Cargando mensajes...</div>';
    }

    try {
        // Obtenemos el canal General
        const { data: channel, error } = await supabaseClient
            .from('channels')
            .select('*')
            .eq('name', 'General')
            .single();

        if (error) throw error;
        
        if (channel) {
            currentChannelId = channel.id;
            await loadMessages();
            subscribeToMessages();
        }
    } catch (e) {
        console.error("Error al iniciar chat: ", e);
        if (chatBox) chatBox.innerHTML = '<div class="text-center text-red-500 py-10">Error cargando el chat.</div>';
    }
}

async function loadMessages() {
    const chatBox = document.getElementById('chat-messages');
    if (!chatBox || !currentChannelId) return;

    // Obtenemos los mensajes y hacemos un "JOIN" automático con la tabla profiles
    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select(`
            id,
            content,
            created_at,
            user_id,
            profiles (
                username,
                avatar_url
            )
        `)
        .eq('channel_id', currentChannelId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return;
    }

    chatBox.innerHTML = ''; // Limpiamos placeholders

    if (!messages || messages.length === 0) {
        chatBox.innerHTML = '<div class="text-center text-gray-500 py-10">Sé el primero en escribir en este canal.</div>';
        return;
    }

    messages.forEach(msg => appendMessage(msg));
}

function appendMessage(msg) {
    const chatBox = document.getElementById('chat-messages');
    if (!chatBox) return;

    // Si había texto de "Sé el primero...", lo borramos
    if (chatBox.innerHTML.includes('Sé el primero')) {
        chatBox.innerHTML = '';
    }

    const isMine = currentUser && msg.user_id === currentUser.id;
    const username = msg.profiles?.username || 'Usuario';
    const avatar = msg.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=random`;
    
    // Formatear hora (ej. 14:30)
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Sanitización anti-XSS Estricta (OWASP)
    const escapeHTML = (str) => String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
    
    const safeContent = escapeHTML(msg.content);
    const safeUsername = escapeHTML(username);

    let msgHTML = '';
    
    if (isMine) {
        msgHTML = `
            <div class="flex flex-col items-end self-end max-w-[85%] md:max-w-[70%] ml-auto text-right mb-6 slide-up-1">
                <div class="flex items-center mb-1 mr-2">
                    <span class="text-xs text-gray-500 mr-2">${time}</span>
                    <span class="text-xs text-brand font-bold">Tú</span>
                </div>
                <div class="chat-bubble-sent px-5 py-3 text-sm text-white mr-2 shadow-lg leading-relaxed rounded-2xl rounded-tr-none bg-brand" style="word-break: break-word;">
                    ${safeContent}
                </div>
            </div>
        `;
    } else {
        msgHTML = `
            <div class="flex flex-col items-start max-w-[85%] md:max-w-[70%] text-left mb-6 slide-up-1">
                <div class="flex items-center mb-1 ml-10">
                    <span class="text-xs text-gray-400 font-bold">${safeUsername}</span>
                    <span class="text-xs text-gray-600 ml-2">${time}</span>
                </div>
                <div class="flex items-end">
                    <img src="${avatar}" alt="User" class="w-8 h-8 rounded-full border border-white/10 mr-2 shrink-0 object-cover">
                    <div class="chat-bubble-received px-5 py-3 text-sm text-gray-200 shadow-sm leading-relaxed rounded-2xl rounded-tl-none bg-dark-800 border border-white/5" style="word-break: break-word;">
                        ${safeContent}
                    </div>
                </div>
            </div>
        `;
    }
    
    chatBox.innerHTML += msgHTML;
    chatBox.scrollTop = chatBox.scrollHeight;
}

function subscribeToMessages() {
    if (!supabaseClient) return;

    chatSubscription = supabaseClient
        .channel('public:messages')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `channel_id=eq.${currentChannelId}` 
        }, async (payload) => {
            // Cuando llega un mensaje nuevo por WebSocket, necesitamos sus datos de perfil
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', payload.new.user_id)
                .single();
                
            const newMessage = { 
                ...payload.new, 
                profiles: profile || { username: 'Nuevo Usuario', avatar_url: null }
            };
            
            appendMessage(newMessage);
        })
        .subscribe();
}

let lastMessageTime = 0;
const MESSAGE_COOLDOWN_MS = 3000; // 3 segundos de protección anti-spam

async function sendMessage() {
    if (!currentUser) {
        alert('Debes iniciar sesión o registrarte para chatear en la Comunidad.');
        navigate('login');
        return;
    }
    
    // Rate Limiting Básico (Frontend)
    const now = Date.now();
    if (now - lastMessageTime < MESSAGE_COOLDOWN_MS) {
        const remaining = Math.ceil((MESSAGE_COOLDOWN_MS - (now - lastMessageTime)) / 1000);
        alert(`Protección anti-spam activa. Espera ${remaining} segundos antes de enviar otro mensaje.`);
        return;
    }
    lastMessageTime = now;
    
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content || !currentChannelId) return;

    input.value = ''; // Limpiamos rápidamente el input para mejor UX
    input.focus();
    
    const { error } = await supabaseClient.from('messages').insert([
        { channel_id: currentChannelId, user_id: currentUser.id, content: content }
    ]);
    
    if (error) {
        console.error('Error enviando mensaje: ', error);
        alert('Error al enviar el mensaje. Intenta de nuevo.');
        lastMessageTime = 0; // Permitir reintento inmediato si falla
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
}

function initRoutines() {
    // Si no hay tarjeta activa mostrándose, inicializar la intermedia por defecto
    const container = document.getElementById('routine-details-container');
    if (container && container.innerHTML.trim() === '') {
        selectRoutineLevel('intermediate', null);
    }
}

// ==========================================
// ACTIVE WORKOUT MODE
// ==========================================
let workoutTimerInterval = null;
let currentWorkoutData = null;

function startWorkout(level, dayIndex) {
    const data = plansData[level];
    if(!data) return;
    
    currentWorkoutData = {
        level: level,
        day: data.days[dayIndex],
        color: data.color,
        border: data.borderColor,
        bgHover: data.bgHover
    };
    
    navigate('workout');
}

function initWorkout() {
    if (!currentWorkoutData) {
        navigate('routines');
        return;
    }
    
    // Header
    const title = document.getElementById('workout-title');
    if(title) title.innerText = `${currentWorkoutData.day.day}: ${currentWorkoutData.day.focus}`;
    
    const container = document.getElementById('workout-exercises');
    if(!container) return;
    
    // Default sets based on level
    let defaultSets = 3;
    if(currentWorkoutData.level === 'intermediate') defaultSets = 4;
    if(currentWorkoutData.level === 'advanced') defaultSets = 5;
    
    // Inyecting UI
    const exercisesHTML = currentWorkoutData.day.exercises.map((ex, exIndex) => {
        let setsHTML = '';
        for(let s=1; s<=defaultSets; s++) {
            setsHTML += `
                <div class="flex items-center justify-between gap-3 p-2 md:p-3 bg-dark-900 rounded-lg border border-white/5 group-set transition-all" id="set-${exIndex}-${s}">
                    <span class="text-gray-500 font-bold w-4 md:w-6 text-sm md:text-base text-center">${s}</span>
                    <div class="flex-1 flex gap-2">
                        <div class="relative w-1/2 group-input">
                            <input type="number" placeholder="Kg" class="w-full bg-dark-800 text-white px-2 py-2.5 rounded-md text-center outline-none focus:${currentWorkoutData.border} focus:ring-1 focus:ring-brand focus:border-transparent text-sm md:text-base transition-colors border border-transparent">
                        </div>
                        <div class="relative w-1/2 group-input">
                            <input type="number" placeholder="Reps" class="w-full bg-dark-800 text-white px-2 py-2.5 rounded-md text-center outline-none focus:${currentWorkoutData.border} focus:ring-1 focus:ring-brand focus:border-transparent text-sm md:text-base transition-colors border border-transparent">
                        </div>
                    </div>
                    <button class="w-10 h-10 rounded-md bg-white/5 border border-white/10 hover:${currentWorkoutData.border} text-gray-400 hover:${currentWorkoutData.color} flex justify-center items-center transition-all bg-dark-800" onclick="completeSet(this)">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="glass-panel p-4 md:p-6 rounded-2xl border-l-4 ${currentWorkoutData.border} slide-up-2 shadow-lg" style="animation-delay: ${exIndex * 100}ms">
                <h3 class="text-lg md:text-xl font-bold text-white mb-4 flex items-center">
                    <i class="fa-solid fa-dumbbell mt-1 mr-3 opacity-50 ${currentWorkoutData.color} text-sm"></i>
                    ${ex}
                </h3>
                <div class="space-y-2 md:space-y-3">
                    <div class="flex text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest px-8 md:px-12 mb-1">
                        <span class="w-1/2 text-center">Peso (Kg)</span>
                        <span class="w-1/2 text-center">Repeticiones</span>
                    </div>
                    ${setsHTML}
                </div>
                <!-- Sección de Notas Privadas -->
                <div class="mt-5 pt-4 border-t border-white/5">
                    <div class="flex items-center text-gray-500 hover:text-white transition-colors cursor-pointer text-xs font-bold uppercase tracking-widest w-fit" onclick="const ta = this.nextElementSibling; ta.classList.toggle('hidden'); if(!ta.classList.contains('hidden')) ta.focus();">
                        <i class="fa-solid fa-pen-to-square mr-2"></i> Notas Personales
                    </div>
                    <textarea class="hidden mt-3 w-full bg-dark-900/80 text-gray-300 text-sm px-4 py-3 rounded-lg outline-none focus:ring-1 focus:ring-${currentWorkoutData.border.split('-')[1] || 'brand'} border border-white/5 resize-none h-24 placeholder-gray-600 transition-all font-mono" placeholder="Ej: Me costó la última serie. Intentar subir 2kg la próxima semana..."></textarea>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = exercisesHTML;
    
    // Reset Timer 
    clearInterval(workoutTimerInterval);
    document.getElementById('workout-timer').innerText = "00:00";
    document.getElementById('workout-timer').className = "text-xl md:text-2xl font-mono font-bold text-white text-right leading-none mt-1";
    document.getElementById('timer-icon').className = `fa-solid fa-stopwatch text-xl mr-2 md:mr-3 text-gray-500`;
}

function completeSet(btn) {
    const setRow = btn.closest('.group-set');
    const inputs = setRow.querySelectorAll('input');
    
    // Capturar valores actuales antes de bloquear
    const currentKg = inputs[0] ? inputs[0].value : '';
    const currentReps = inputs[1] ? inputs[1].value : '';
    
    // Estilo Visual de Completado
    btn.innerHTML = '<i class="fa-solid fa-check-double drop-shadow-md"></i>';
    btn.className = `w-10 h-10 rounded-md border border-transparent flex justify-center items-center transition-all bg-dark-800 opacity-60 ${currentWorkoutData.color} shadow-inner cursor-default`;
    
    inputs.forEach(input => {
        input.classList.remove('bg-dark-800');
        input.classList.add('bg-brand/10', 'border-brand/30', currentWorkoutData.color, 'font-bold');
        input.readOnly = true;
    });
    setRow.classList.add('border-brand/20', 'bg-dark-900/40');
    
    // Auto-rellenar la siguiente serie con los mismos valores como borrador
    const exercisePanel = setRow.closest('.glass-panel');
    if (exercisePanel) {
        const allSets = exercisePanel.querySelectorAll('.group-set');
        const allSetsArr = Array.from(allSets);
        const currentIndex = allSetsArr.indexOf(setRow);
        const nextSet = allSetsArr[currentIndex + 1];
        
        if (nextSet) {
            const nextInputs = nextSet.querySelectorAll('input[type="number"]');
            if (nextInputs[0] && !nextInputs[0].value && currentKg) {
                nextInputs[0].value = currentKg;
                nextInputs[0].classList.add('text-gray-500', 'italic');
                nextInputs[0].addEventListener('focus', function handler() {
                    this.classList.remove('text-gray-500', 'italic');
                    this.removeEventListener('focus', handler);
                }, { once: true });
            }
            if (nextInputs[1] && !nextInputs[1].value && currentReps) {
                nextInputs[1].value = currentReps;
                nextInputs[1].classList.add('text-gray-500', 'italic');
                nextInputs[1].addEventListener('focus', function handler() {
                    this.classList.remove('text-gray-500', 'italic');
                    this.removeEventListener('focus', handler);
                }, { once: true });
            }
        }
    }
    
    // Iniciar temporizador
    const restSeconds = parseInt(document.getElementById('workout-rest-time').value) || 90;
    startRestTimer(restSeconds);
}

function startRestTimer(seconds) {
    clearInterval(workoutTimerInterval);
    let timeLeft = seconds;
    const display = document.getElementById('workout-timer');
    const icon = document.getElementById('timer-icon');
    
    display.className = `text-xl md:text-2xl font-mono font-bold text-right leading-none mt-1 ${currentWorkoutData.color} drop-shadow-[0_0_8px_currentColor]`;
    icon.className = `fa-solid fa-stopwatch text-xl mr-2 md:mr-3 ${currentWorkoutData.color} animate-bounce`;
    
    const updateDisplay = () => {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        display.innerText = `${m}:${s}`;
        
        if(timeLeft <= 10 && timeLeft > 0) {
            display.className = `text-xl md:text-2xl font-mono font-bold text-right leading-none mt-1 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]`;
            icon.className = `fa-solid fa-stopwatch text-xl mr-2 md:mr-3 text-red-500 animate-pulse`;
        }
    };
    
    updateDisplay();
    
    workoutTimerInterval = setInterval(() => {
        timeLeft--;
        if(timeLeft < 0) {
            clearInterval(workoutTimerInterval);
            display.innerText = "¡YA!";
            display.className = `text-xl md:text-2xl font-mono font-bold text-right leading-none mt-1 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]`;
            icon.className = `fa-solid fa-bell text-xl mr-2 md:mr-3 text-green-500 animate-[wiggle_1s_ease-in-out_infinite]`;
            
            // Un pequeño sonido si el navegador lo permite
            try { new Audio('data:audio/wav;base64,UklGRtQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YcAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgP//////////////////////////////////wP///8D///8A//8A//8A////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA').play(); } catch(e){}
        } else {
            updateDisplay();
        }
    }, 1000);
}

async function finishWorkout() {
    clearInterval(workoutTimerInterval);
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-3"></i> Guardando Progreso...';
    btn.classList.add('pointer-events-none', 'opacity-70');
    
    // Capture all exercise data from the DOM
    const exercisePanels = document.querySelectorAll('#workout-exercises > div');
    const exerciseData = [];
    
    exercisePanels.forEach((panel, exIndex) => {
        const exName = currentWorkoutData.day.exercises[exIndex] || 'Ejercicio';
        const sets = [];
        const setRows = panel.querySelectorAll('.group-set');
        
        setRows.forEach((row, sIndex) => {
            const inputs = row.querySelectorAll('input[type="number"]');
            const kg = inputs[0] ? parseFloat(inputs[0].value) || 0 : 0;
            const reps = inputs[1] ? parseInt(inputs[1].value) || 0 : 0;
            sets.push({ set: sIndex + 1, kg, reps });
        });
        
        const notesEl = panel.querySelector('textarea');
        const notes = notesEl ? notesEl.value.trim() : '';
        
        exerciseData.push({ name: exName, sets, notes });
    });
    
    try {
        if (supabaseClient && currentUser) {
            const { error } = await supabaseClient
                .from('workout_logs')
                .insert({
                    user_id: currentUser.id,
                    level: currentWorkoutData.level,
                    day_label: currentWorkoutData.day.day,
                    focus: currentWorkoutData.day.focus,
                    exercises: exerciseData
                });
            
            if (error) throw error;
        }
        
        alert('¡BRUTAL! 🏆 Entrenamiento guardado correctamente. Puedes ver tu historial en Mi Perfil > Progreso.');
        navigate('routines');
        
    } catch(e) {
        console.error('Error guardando entrenamiento:', e);
        alert('Entrenamiento completado pero hubo un error al guardar: ' + (e.message || ''));
        navigate('routines');
    }
}

// ==========================================
// CLASSES & SCHEDULE
// ==========================================
const scheduleData = {
    times: [
        "8:30 a 9:15",
        "9:30 a 10:15",
        "17:30 a 18:15",
        "18:30 a 19:15",
        "19:30 a 20:15",
        "20:30 a 21:15"
    ],
    grid: [
        ["Mantenimiento 3ª Edad", "Aerostep 3ª Edad", "Body Pam 3ª Edad", "Mantenimiento 3ª Edad", "Estiramientos"],
        ["Gluteboom", "Body Combat", "Step Extrem", "Body Pam", "Skate Indoor"],
        ["Cardio HIIT", "Body Pam", "Tono Funcional", "Ciclo Indoor", ""],
        ["Body Pam", "Skate Indoor", "Latinos", "Entrenamiento Funcional Extremo", ""],
        ["Body Combat", "TBC/Skate", "Gluteboom", "Ciclo Indoor", ""],
        ["Circuito", "Ciclo Indoor", "Cardio HIIT", "", ""]
    ]
};

async function initClasses() {
    const gridEl = document.getElementById('schedule-grid');
    if(!gridEl) return;
    
    // Mostrar spinner mientras cargan datos reales
    gridEl.innerHTML = `
        <div class="col-span-full py-20 text-center">
            <i class="fa-solid fa-spinner fa-spin text-4xl text-brand mb-4"></i>
            <p class="text-gray-500 uppercase text-xs font-bold tracking-widest italic">Sincronizando disponibilidad...</p>
        </div>
    `;

    // Cargar reservas globales para calcular ocupación
    let allReservations = [];
    if (supabaseClient) {
        try {
            const { data } = await supabaseClient.from('class_reservations').select('*').eq('status', 'confirmed');
            allReservations = data || [];
        } catch(e) { console.error("Error fetching all reservations:", e); }
    }

    let html = '';
    const dayMap = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    scheduleData.times.forEach((time, rowIndex) => {
        let colsHTML = '';
        
        scheduleData.grid[rowIndex].forEach((className, colIndex) => {
            if(!className) {
                colsHTML += `
                    <div class="p-4 border-l md:border-white/5 border-transparent schedule-slot bg-dark-900/10 ${colIndex >= 3 ? 'hidden lg:block' : ''} ${colIndex === 2 ? 'hidden md:block' : ''}">
                    </div>
                `;
                return;
            }
            
            const dayOfWeek = dayMap[colIndex] || 'Lunes';
            const isReservable = className.toLowerCase().includes('skate') || className.toLowerCase().includes('ciclo');
            
            let btnHTML = '';
            let highlightClass = 'hover:bg-brand/5';
            let titleColor = 'text-white';
            
            if (isReservable) {
                // Calcular ocupación real
                const totalReservations = allReservations.filter(r => 
                    r.class_name === className && 
                    r.time_slot === time && 
                    r.day_of_week === dayOfWeek
                );
                
                const currentAtte = totalReservations.length; 
                const maxAtte = 15;
                const isUserBooked = currentUser && totalReservations.some(r => r.user_id === currentUser.id);
                
                const capId = `cap-${rowIndex}-${colIndex}`;
                
                const capacityHTML = `
                    <div class="text-[10px] text-gray-400 font-mono mt-1 mb-2 text-center bg-dark-900/50 rounded py-1 border border-white/5">
                        <span class="text-neon font-bold" id="${capId}">${currentAtte}</span> / ${maxAtte} 
                        <span class="uppercase tracking-widest text-[8px]">Reservas</span>
                    </div>`;
                
                highlightClass = 'hover:bg-neon/5 ring-1 ring-transparent hover:ring-neon/20';
                titleColor = 'text-neon';
                
                if (isUserBooked) {
                    btnHTML = `
                        ${capacityHTML}
                        <button class="w-full bg-green-600/20 text-green-500 border border-green-500/30 text-xs py-2 rounded transition-all uppercase font-bold tracking-wider shadow-sm flex justify-center items-center pointer-events-none">
                            <i class="fa-solid fa-check-double mr-2"></i> Reservado
                        </button>
                    `;
                } else if (currentAtte >= maxAtte) {
                    btnHTML = `
                        ${capacityHTML}
                        <button class="w-full bg-gray-500/10 text-gray-500 border border-gray-500/30 text-xs py-2 rounded transition-all uppercase font-bold tracking-wider shadow-sm flex justify-center items-center pointer-events-none opacity-50">
                            <i class="fa-solid fa-ban mr-2"></i> Completo
                        </button>
                    `;
                } else {
                    btnHTML = `
                        ${capacityHTML}
                        <button onclick="reserveClass('${className}', '${time}', this, '${capId}')" class="w-full bg-neon/10 text-neon hover:bg-neon hover:text-dark-900 border border-neon/30 text-xs py-2 rounded transition-all uppercase font-bold tracking-wider shadow-sm flex justify-center items-center">
                            <i class="fa-regular fa-calendar-check mr-2"></i> Reservar
                        </button>
                    `;
                }
            } else {
                btnHTML = `<div class="w-full mt-3 text-center text-[10px] text-gray-500 uppercase font-bold border border-white/5 py-2 rounded bg-dark-800 pointer-events-none opacity-50"><i class="fa-solid fa-door-open mr-1"></i> Libre Acceso</div>`;
            }
            
            let responsiveClass = '';
            if (colIndex === 2) responsiveClass = 'hidden md:block'; 
            if (colIndex === 3) responsiveClass = 'hidden lg:block'; 
            if (colIndex === 4) responsiveClass = 'hidden lg:block'; 
            
            colsHTML += `
                <div class="p-4 border-l md:border-white/5 border-transparent schedule-slot transition-all group ${highlightClass} ${responsiveClass}">
                    <span class="block ${titleColor} font-bold mb-1 group-hover:drop-shadow-md transition-all">${className}</span>
                    <span class="block text-[10px] text-gray-500 mb-2 font-bold"><i class="fa-regular fa-clock mr-1 opacity-50"></i> 45 min</span>
                    ${btnHTML}
                </div>
            `;
        });
        
        html += `
            <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 border-b border-white/5 text-sm group/row hover:bg-dark-800/80 transition-colors animate-fade-in-up" style="animation-duration: 0.5s; animation-fill-mode: both; animation-delay: ${rowIndex * 100}ms;">
                <div class="p-4 flex flex-col md:flex-row md:items-center justify-center font-heading text-lg text-brand md:text-gray-500 bg-dark-900/30 font-bold whitespace-nowrap group-hover/row:text-white transition-colors">
                    ${time}
                </div>
                ${colsHTML}
            </div>
        `;
    });
    
    gridEl.innerHTML = html;
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

async function reserveClass(className, time, btnElement, capId) {
    if(!currentUser) {
        alert("Debes iniciar sesión con tu cuenta para reservar pistas y clases.");
        navigate('login');
        return;
    }
    
    // Check if already reserved this session
    if(btnElement.innerText.includes('Apuntado')) {
        return;
    }
    
    // Loading state
    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    btnElement.classList.add('opacity-70', 'pointer-events-none');
    
    // Determine day of week from column index
    const colIndex = parseInt(capId.split('-')[2]);
    const dayMap = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const dayOfWeek = dayMap[colIndex] || 'Lunes';
    
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('class_reservations')
                .insert({
                    user_id: currentUser.id,
                    class_name: className,
                    time_slot: time,
                    day_of_week: dayOfWeek,
                    status: 'confirmed'
                })
                .select();
            
            if (error) throw error;
        }
        
        // Success UI
        alert(`¡Reserva confirmada! Te esperamos en ${className} el ${dayOfWeek} a las ${time}.`);
        initClasses(); // Sincronizar todo el horario con los nuevos datos reales

    } catch(e) {
        console.error('Error reservando clase:', e);
        btnElement.innerHTML = originalHTML;
        btnElement.classList.remove('opacity-70', 'pointer-events-none');
        alert('Error al reservar: ' + (e.message || 'Inténtalo de nuevo.'));
    }
}

// ==========================================
// USER PROFILE DASHBOARD
// ==========================================

async function initProfile() {
    if (!currentUser) {
        navigate('login');
        return;
    }

    // Asegurar que tenemos el perfil cargado
    if (!currentUserProfile) {
        try {
            let { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();
            
            if (!data && !error) {
                // Si el perfil no existe (ej. tras reset de base de datos) lo creamos al vuelo
                console.log('✨ Creando perfil faltante para:', currentUser.email);
                const { data: newProfile, error: createError } = await supabaseClient
                    .from('profiles')
                    .insert({
                        id: currentUser.id,
                        username: currentUser.email.split('@')[0],
                        full_name: currentUser.email.split('@')[0],
                        role: 'member'
                    })
                    .select()
                    .single();
                
                if (newProfile) data = newProfile;
            }

            if (data) currentUserProfile = data;
        } catch (err) {
            console.error('Error cargando/creando perfil en init:', err);
        }
    }

    // Poblar datos
    const greetNameEl = document.getElementById('profile-greet-name');
    const roleEl = document.getElementById('profile-role-badge');
    const avatarEl = document.getElementById('profile-avatar');
    
    const email = currentUser.email || 'Usuario';
    const profileName = currentUserProfile?.username || currentUser.user_metadata?.full_name || email.split('@')[0];

    if (greetNameEl) greetNameEl.innerText = profileName;
    if (roleEl) {
        roleEl.innerText = currentUserProfile?.role || 'member';
        roleEl.classList.toggle('text-brand', currentUserProfile?.role === 'admin');
    }
    const emailInp = document.getElementById('profile-email-input');
    if (emailInp) emailInp.value = email;
    if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${profileName}&background=random`;

    // Poblar campos editables
    const usernameInput = document.getElementById('profile-username-input');
    const fullNameInput = document.getElementById('profile-name-input');
    const phoneInput = document.getElementById('profile-phone-input');
    const birthInput = document.getElementById('profile-birth-input');

    if (usernameInput) usernameInput.value = currentUserProfile?.username || '';
    if (fullNameInput) fullNameInput.value = currentUserProfile?.full_name || '';
    if (phoneInput) phoneInput.value = currentUserProfile?.phone || '';
    if (birthInput) birthInput.value = currentUserProfile?.birth_date || '';
    
    // Cargar reservas desde Supabase
    loadUserReservations();
    
    // Cargar historial de entrenamientos
    loadWorkoutHistory();

    // Actualizar sección de suscripción
    updateSubscriptionUI();
    
    // Switch por defecto a dashboard
    switchProfileTab('dashboard');
}

function updateSubscriptionUI() {
    const container = document.getElementById('tab-subscription');
    if (!container) return;

    const estado = currentUserProfile?.payment_status || 'pending';
    let content = '';

    if (estado === 'paid' || estado === 'vip') {
        const planName = estado === 'vip' ? 'VIP Full Access' : 'Plan Mensual Shidy\'s Fit';
        const colorClass = estado === 'vip' ? 'from-brand/20 to-brand/5 border-brand/30' : 'from-neon/20 to-neon/5 border-neon/30';
        const iconClass = estado === 'vip' ? 'fa-crown text-brand' : 'fa-check-double text-neon';

        content = `
            <div class="space-y-8 animate-fade-in">
                <header class="flex items-center justify-between border-b border-white/5 pb-4">
                    <h2 class="text-2xl font-heading font-bold text-white uppercase tracking-tighter italic">Suscripción Activa</h2>
                    <span class="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-green-500/20">
                        <i class="fa-solid fa-circle-check mr-1"></i> Verificado
                    </span>
                </header>

                <div class="relative group">
                    <div class="absolute -inset-0.5 bg-gradient-to-r ${estado === 'vip' ? 'from-brand to-purple-600' : 'from-neon to-cyan-500'} rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div class="relative bg-dark-900 border border-white/10 rounded-2xl p-8 overflow-hidden shadow-2xl">
                        <i class="fa-solid ${iconClass} absolute -bottom-6 -right-6 text-9xl opacity-5 transform -rotate-12 transition-transform group-hover:rotate-0 duration-700"></i>
                        
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h3 class="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">Membresía Actual</h3>
                                <h4 class="text-4xl font-heading font-black text-white italic uppercase leading-none mb-4">${planName}</h4>
                                <div class="flex items-center gap-4 text-xs">
                                    <span class="text-white font-bold"><i class="fa-solid fa-bolt text-brand mr-1.5"></i> Acceso 24/7</span>
                                    <span class="text-gray-500">|</span>
                                    <span class="text-white font-bold"><i class="fa-solid fa-dumbbell text-brand mr-1.5"></i> Clases Ilimitadas</span>
                                </div>
                            </div>
                            <div class="flex flex-col items-center md:items-end">
                                <button onclick="handlePortal()" class="bg-white text-black hover:bg-brand hover:text-white px-8 py-4 rounded-xl font-heading font-bold uppercase tracking-widest transition-all shadow-xl hover:shadow-brand/20 active:scale-95 flex items-center gap-3">
                                    <i class="fa-solid fa-sliders text-sm opacity-50"></i> Gestionar Pagos
                                </button>
                                <p class="text-[9px] text-gray-600 uppercase font-bold mt-4 tracking-tighter">Procesado de forma segura por Stripe</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-brand/5 border border-brand/20 rounded-xl p-5 flex items-start gap-4">
                    <div class="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center shrink-0 border border-brand/20">
                        <i class="fa-solid fa-circle-info text-brand"></i>
                    </div>
                    <div>
                        <h5 class="text-white font-bold text-sm mb-1 uppercase tracking-wider">¿Necesitas Cancelar o Cambiar tu tarjeta?</h5>
                        <p class="text-gray-400 text-xs leading-relaxed">
                            Haz clic en <span class="text-white font-bold">"Gestionar Pagos"</span> para acceder al portal seguro de Stripe. Desde allí podrás darte de baja en cualquier momento con un solo clic o actualizar tus datos de facturación. <span class="text-brand font-bold italic">¡Sin permanencia!</span>
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else {
        content = `
            <div class="animate-fade-in">
                <h2 class="text-2xl font-heading font-bold text-white uppercase mb-8 border-b border-white/10 pb-4 tracking-tighter italic">Únete al Equipo</h2>
                <div class="bg-dark-800 border border-white/5 rounded-2xl p-10 text-center relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-50"></div>
                    <div class="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-brand/20 shadow-[0_0_30px_rgba(255,51,102,0.15)]">
                        <i class="fa-solid fa-id-card text-4xl text-brand group-hover:scale-110 transition-transform"></i>
                    </div>
                    <h3 class="text-2xl font-heading font-black text-white uppercase mb-3 italic">No tienes una suscripción activa</h3>
                    <p class="text-gray-400 text-sm mb-10 max-w-sm mx-auto leading-relaxed">Obtén acceso total a Shidy's Fit, reserva pistas de Pickleball ilimitadas y disfruta de nuestra comunidad exclusive.</p>
                    <div class="max-w-sm mx-auto bg-dark-900/80 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-left mb-10 transform hover:scale-[1.02] transition-all">
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <span class="text-[10px] font-bold text-brand uppercase tracking-[0.3em] block mb-1">Cuota Mensual</span>
                                <span class="text-4xl font-heading font-black text-white italic">30€</span>
                            </div>
                            <div class="text-right">
                                <span class="text-[9px] text-gray-500 uppercase font-bold block">Próximo cobro</span>
                                <span class="text-[11px] text-white font-bold">En 30 días</span>
                            </div>
                        </div>
                        <ul class="space-y-4 text-xs text-gray-300 mb-8">
                            <li class="flex items-center gap-3"><i class="fa-solid fa-bolt text-brand text-[10px]"></i> Acceso 24/7 Musculación & Cardio</li>
                            <li class="flex items-center gap-3"><i class="fa-solid fa-bolt text-brand text-[10px]"></i> Clases dirigidas (Yoga, Box, Cross)</li>
                            <li class="flex items-center gap-3"><i class="fa-solid fa-bolt text-brand text-[10px]"></i> Reservas de Pista de Pickleball Gratis</li>
                        </ul>
                        <button onclick="handleSubscription()" class="w-full bg-brand hover:bg-brand-hover text-white font-heading py-4 rounded-xl font-black tracking-[0.2em] uppercase transition-all shadow-[0_10px_30px_rgba(255,51,102,0.3)] hover:-translate-y-1 active:scale-95">
                             Quiero Ser Socio
                        </button>
                    </div>
                    <p class="text-[10px] text-gray-600 uppercase font-bold tracking-widest"><i class="fa-solid fa-shield-halved mr-2"></i> Pago seguro 256-bit cifrado</p>
                </div>
            </div>
        `;
    }

    container.innerHTML = content;
}

async function saveProfileChanges(btn) {
    if (!supabaseClient || !currentUser) return;
    
    const username = document.getElementById('profile-username-input').value.trim();
    const full_name = document.getElementById('profile-name-input').value.trim();
    const phone = document.getElementById('profile-phone-input').value.trim();
    const birth_date = document.getElementById('profile-birth-input').value;

    if (!username) {
        alert('El nombre de usuario es obligatorio.');
        return;
    }

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Guardando...';
    btn.classList.add('pointer-events-none', 'opacity-50');

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .update({ 
                username, 
                full_name, 
                phone, 
                birth_date: birth_date || null 
            })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) throw error;

        // Actualizar estado local
        currentUserProfile = data;
        
        // Actualizar UI
        const greetNameEl = document.getElementById('profile-greet-name');
        if (greetNameEl) greetNameEl.innerText = username;
        
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${username}&background=random`;

        updateUIWithAuthState(); // Para el botón del menú
        
        alert('✅ Perfil actualizado con éxito.');
        
    } catch (err) {
        console.error('Error actualizando perfil:', err);
        alert('❌ Error al guardar los cambios: ' + (err.message || 'Error desconocido'));
    } finally {
        btn.innerHTML = originalHTML;
        btn.classList.remove('pointer-events-none', 'opacity-50');
    }
}

async function saveUserWeight(btn) {
    if (!currentUser || !supabaseClient) return;
    
    const weightVal = document.getElementById('profile-weight-slider').value;
    const originalHTML = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Guardando...';
    btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ last_weight: parseFloat(weightVal) })
            .eq('id', currentUser.id);

        if (error) throw error;
        
        // Actualizar perfil local
        if (currentUserProfile) currentUserProfile.last_weight = parseFloat(weightVal);
        
        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> ¡Guardado!';
        btn.classList.add('bg-green-500', 'text-white');
        btn.classList.remove('bg-white/5', 'text-gray-300');
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            btn.classList.remove('bg-green-500', 'text-white');
            btn.classList.add('bg-white/5', 'text-gray-300');
        }, 2000);

    } catch (err) {
        console.error('Error al guardar peso:', err);
        alert('Error al guardar: ' + err.message);
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

async function loadUserReservations() {
    if (!supabaseClient || !currentUser) return;
    
    const container = document.getElementById('tab-reservations');
    if (container) {
        container.innerHTML = `
            <h2 class="text-2xl font-heading font-bold text-white uppercase mb-8 border-b border-white/10 pb-4">Mis Reservas</h2>
            <div class="text-center py-20">
                <i class="fa-solid fa-spinner fa-spin text-3xl text-brand mb-4"></i>
                <p class="text-gray-500 uppercase text-[10px] font-bold tracking-widest">Sincronizando tus reservas...</p>
            </div>
        `;
    }
    
    try {
        const { data: reservations, error } = await supabaseClient
            .from('class_reservations')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderProfileReservations(reservations || []);
        renderDashboardNextClass(reservations || []);
        
    } catch(e) {
        console.error('Error cargando reservas:', e);
        renderProfileReservations([]); // Limpiar spinner incluso si hay error
    }
}

function renderProfileReservations(reservations) {
    const container = document.getElementById('tab-reservations');
    if (!container) return;
    
    const confirmed = reservations.filter(r => r.status === 'confirmed');
    const cancelled = reservations.filter(r => r.status === 'cancelled');
    
    let html = `<h2 class="text-2xl font-heading font-bold text-white uppercase mb-8 border-b border-white/10 pb-4">Mis Reservas</h2>`;
    
    if (confirmed.length === 0 && cancelled.length === 0) {
        html += `
            <div class="text-center py-16">
                <i class="fa-regular fa-calendar-xmark text-5xl text-gray-600 mb-4"></i>
                <p class="text-gray-500">Aún no has reservado ninguna clase.</p>
                <button onclick="navigate('classes')" class="mt-4 text-brand text-sm font-bold uppercase tracking-widest hover:text-white transition-colors"><i class="fa-solid fa-plus mr-2"></i> Explorar Horario</button>
            </div>
        `;
    } else {
        html += '<div class="space-y-4">';
        
        confirmed.forEach(r => {
            const date = new Date(r.created_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            html += `
                <div class="bg-dark-900 border border-white/5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center p-5">
                    <div class="mb-4 sm:mb-0">
                        <span class="bg-neon/20 text-neon text-[10px] font-bold uppercase px-2 py-1 rounded inline-block mb-2">Activa • ${r.day_of_week}</span>
                        <h4 class="text-lg font-bold text-white mb-1">${r.class_name}</h4>
                        <p class="text-xs text-gray-400"><i class="fa-regular fa-calendar mr-1"></i> ${date} <span class="mx-2">|</span> <i class="fa-regular fa-clock mr-1"></i> ${r.time_slot}</p>
                    </div>
                    <button onclick="cancelReservation('${r.id}', this)" class="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all w-full sm:w-auto"><i class="fa-regular fa-circle-xmark mr-2"></i> Cancelar</button>
                </div>
            `;
        });
        
        cancelled.forEach(r => {
            const date = new Date(r.created_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            html += `
                <div class="bg-dark-900 border border-white/5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 opacity-40">
                    <div>
                        <span class="bg-white/10 text-gray-400 text-[10px] font-bold uppercase px-2 py-1 rounded inline-block mb-2">Cancelada</span>
                        <h4 class="text-lg font-bold text-white mb-1 line-through">${r.class_name}</h4>
                        <p class="text-xs text-gray-400"><i class="fa-regular fa-calendar mr-1"></i> ${date} <span class="mx-2">|</span> <i class="fa-regular fa-clock mr-1"></i> ${r.time_slot}</p>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    container.innerHTML = html;
}

function renderDashboardNextClass(reservations) {
    const nextClassContainer = document.getElementById('profile-next-res-container');
    if (!nextClassContainer) return;
    
    const confirmed = reservations.filter(r => r.status === 'confirmed');
    
    if (confirmed.length > 0) {
        const next = confirmed[0]; // La más reciente según el orden de carga
        nextClassContainer.innerHTML = `
            <div class="bg-brand/10 border-l-4 border-brand p-6 rounded-r-xl slide-up-1">
                <h4 class="text-2xl font-heading font-bold text-white mb-2 uppercase italic tracking-tighter">${next.class_name}</h4>
                <div class="flex items-center gap-4">
                    <p class="text-sm text-gray-300"><i class="fa-regular fa-calendar text-brand mr-2"></i> ${next.day_of_week}</p>
                    <p class="text-sm text-gray-300"><i class="fa-regular fa-clock text-brand mr-2"></i> ${next.time_slot}</p>
                </div>
            </div>
        `;
    } else {
        nextClassContainer.innerHTML = `
            <div class="bg-white/5 border border-white/5 p-6 rounded-xl border-dashed">
                <h4 class="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Sin reservas activas</h4>
                <p class="text-xs text-gray-600">Explora el horario de clases para asegurar tu plaza.</p>
            </div>
        `;
    }
}

async function cancelReservation(reservationId, btnElement) {
    if (!supabaseClient || !currentUser) return;
    
    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    btnElement.classList.add('pointer-events-none', 'opacity-50');
    
    try {
        const { error } = await supabaseClient
            .from('class_reservations')
            .update({ status: 'cancelled' })
            .eq('id', reservationId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        // Recargar las reservas
        await loadUserReservations();
        
    } catch(e) {
        console.error('Error cancelando reserva:', e);
        btnElement.innerHTML = originalHTML;
        btnElement.classList.remove('pointer-events-none', 'opacity-50');
        alert('Error al cancelar: ' + (e.message || 'Inténtalo de nuevo.'));
    }
}

async function loadWorkoutHistory() {
    if (!supabaseClient || !currentUser) return;
    
    try {
        const { data: logs, error } = await supabaseClient
            .from('workout_logs')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        renderWorkoutHistory(logs || []);
        
    } catch(e) {
        console.error('Error cargando historial:', e);
    }
}

function renderWorkoutHistory(logs) {
    const container = document.getElementById('tab-progress');
    if (!container) return;
    
    // Build history section below existing widgets
    let historyHTML = `
        <h2 class="text-2xl font-heading font-bold text-white uppercase mb-8 border-b border-white/10 pb-4">Mi Progreso</h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            <div class="bg-dark-900 border border-white/5 rounded-xl p-6">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4"><i class="fa-solid fa-weight-scale mr-2"></i> Peso Actual</h3>
                <div class="flex items-end mb-4">
                    <span class="text-4xl font-mono font-bold text-white" id="profile-weight-val">78.5</span>
                    <span class="text-gray-500 ml-2 pb-1 font-bold">Kg</span>
                </div>
                <input type="range" min="40" max="150" value="78.5" oninput="document.getElementById('profile-weight-val').innerText = this.value" class="w-full outline-none accent-brand bg-dark-800 rounded-lg appearance-none h-2">
                <button class="mt-4 w-full bg-white/5 hover:bg-brand text-gray-300 hover:text-white text-xs py-2 rounded uppercase font-bold tracking-widest transition-colors">Actualizar Registro</button>
            </div>
            
            <div class="bg-dark-900 border border-white/5 rounded-xl p-6">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4"><i class="fa-solid fa-route mr-2"></i> Rutina Activa</h3>
                <p class="text-[10px] text-gray-500 mb-3 bg-dark-800 p-2 rounded">Selecciona la rutina que estás siguiendo.</p>
                <select class="w-full bg-dark-800 border border-white/10 text-white text-sm rounded-lg outline-none focus:border-brand px-3 py-3 mb-4 cursor-pointer appearance-none uppercase tracking-wide font-bold">
                    <option value="beginner">🟢 Principiante</option>
                    <option value="intermediate" selected>🟠 Intermedio</option>
                    <option value="advanced">🔴 Avanzado</option>
                </select>
                <button onclick="navigate('routines')" class="w-full bg-transparent border border-brand/50 hover:bg-brand text-brand hover:text-white text-xs py-2 rounded uppercase font-bold tracking-widest transition-colors"><i class="fa-solid fa-play mr-2"></i> Ir a mi Rutina</button>
            </div>
        </div>
    `;
    
    // Workout history section
    historyHTML += `<h3 class="text-sm font-bold text-white uppercase tracking-widest mb-4 border-t border-white/10 pt-6"><i class="fa-solid fa-clock-rotate-left mr-2 text-brand"></i> Historial de Entrenamientos</h3>`;
    
    if (logs.length === 0) {
        historyHTML += `
            <div class="text-center py-10">
                <i class="fa-solid fa-dumbbell text-4xl text-gray-700 mb-3"></i>
                <p class="text-gray-500 text-sm">Aún no has guardado ningún entrenamiento.</p>
                <button onclick="navigate('routines')" class="mt-3 text-brand text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"><i class="fa-solid fa-plus mr-1"></i> Empezar uno ahora</button>
            </div>
        `;
    } else {
        historyHTML += '<div class="space-y-4">';
        
        const levelColors = { beginner: 'text-green-500', intermediate: 'text-brand', advanced: 'text-orange-500' };
        const levelLabels = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };
        
        logs.forEach(log => {
            const date = new Date(log.created_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            const color = levelColors[log.level] || 'text-white';
            const label = levelLabels[log.level] || log.level;
            
            // Calculate totals
            let totalKg = 0, totalReps = 0, totalSets = 0;
            (log.exercises || []).forEach(ex => {
                (ex.sets || []).forEach(s => {
                    if (s.kg > 0 || s.reps > 0) {
                        totalKg += (s.kg * s.reps);
                        totalReps += s.reps;
                        totalSets++;
                    }
                });
            });
            
            // Build exercise detail (collapsed)
            let detailHTML = '';
            (log.exercises || []).forEach(ex => {
                const setsDetail = (ex.sets || []).filter(s => s.kg > 0 || s.reps > 0).map(s => `${s.kg}kg x${s.reps}`).join(', ');
                if (setsDetail) {
                    detailHTML += `<div class="text-xs text-gray-400 py-1 border-b border-white/5 flex justify-between"><span class="text-white font-medium">${ex.name}</span><span class="font-mono text-gray-500">${setsDetail}</span></div>`;
                }
                if (ex.notes) {
                    detailHTML += `<div class="text-[10px] text-gray-600 italic pl-2 mb-1"><i class="fa-solid fa-pen mr-1"></i> ${ex.notes}</div>`;
                }
            });
            
            historyHTML += `
                <div class="bg-dark-900 border border-white/5 rounded-lg overflow-hidden">
                    <div class="p-4 cursor-pointer flex justify-between items-center hover:bg-dark-800 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden')">
                        <div>
                            <span class="${color} text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-dark-800 border border-white/5 inline-block mb-2">${label}</span>
                            <h4 class="text-white font-bold">${log.day_label}: ${log.focus}</h4>
                            <p class="text-xs text-gray-500 mt-1"><i class="fa-regular fa-calendar mr-1"></i> ${date}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-mono font-bold text-white">${Math.round(totalKg).toLocaleString()}<span class="text-xs text-gray-500 ml-1">kg vol.</span></p>
                            <p class="text-[10px] text-gray-500">${totalSets} series • ${totalReps} reps</p>
                        </div>
                    </div>
                    <div class="hidden px-4 pb-4 border-t border-white/5 pt-3">
                        ${detailHTML || '<p class="text-xs text-gray-600 italic">Sin datos registrados en esta sesión.</p>'}
                    </div>
                </div>
            `;
        });
        
        historyHTML += '</div>';
    }
    
    container.innerHTML = historyHTML;
}

// ==========================================
// MEMBERSHIP MODAL (3-Step Wizard)
// ==========================================

let modalAuthMode = 'login';

function openMembershipModal() {
    const modal = document.getElementById('membership-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        // If already logged in, skip to step 3
        if (currentUser) {
            goToModalStep(3);
        } else {
            goToModalStep(1);
        }
    }
}

function closeMembershipModal() {
    const modal = document.getElementById('membership-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
}

function goToModalStep(step) {
    // Hide all steps
    document.getElementById('modal-step-1')?.classList.add('hidden');
    document.getElementById('modal-step-2')?.classList.add('hidden');
    document.getElementById('modal-step-3')?.classList.add('hidden');
    
    // Show target step
    document.getElementById(`modal-step-${step}`)?.classList.remove('hidden');
    
    // Update progress dots
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById(`step-dot-${i}`);
        if (dot) {
            dot.className = i <= step 
                ? 'h-1 flex-1 rounded-full bg-white transition-all' 
                : 'h-1 flex-1 rounded-full bg-white/20 transition-all';
        }
    }
    
    // Update step counter
    const stepNum = document.getElementById('modal-step-num');
    if (stepNum) stepNum.innerText = step;
    
    // Update title
    const titles = { 1: 'Hazte Socio', 2: 'Tu Cuenta', 3: 'Método de Pago' };
    const titleEl = document.getElementById('modal-title');
    if (titleEl) titleEl.innerText = titles[step];
    
    // Clear errors
    document.getElementById('modal-auth-error')?.classList.add('hidden');
}

function setModalAuthTab(mode) {
    modalAuthMode = mode;
    const loginTab = document.getElementById('modal-tab-login');
    const registerTab = document.getElementById('modal-tab-register');
    const authBtn = document.getElementById('modal-auth-btn');
    
    if (mode === 'login') {
        loginTab.className = 'flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md bg-brand text-white transition-all';
        registerTab.className = 'flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md text-gray-400 transition-all';
        authBtn.querySelector('span').innerText = 'Entrar y Continuar';
    } else {
        registerTab.className = 'flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md bg-brand text-white transition-all';
        loginTab.className = 'flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md text-gray-400 transition-all';
        authBtn.querySelector('span').innerText = 'Crear Cuenta y Continuar';
    }
}

async function handleModalAuth() {
    const email = document.getElementById('modal-email')?.value?.trim();
    const password = document.getElementById('modal-password')?.value;
    const errorDiv = document.getElementById('modal-auth-error');
    const errorText = document.getElementById('modal-auth-error-text');
    const btn = document.getElementById('modal-auth-btn');
    
    if (!email || !password) {
        errorDiv.classList.remove('hidden');
        errorText.innerText = 'Rellena todos los campos.';
        return;
    }
    
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    btn.classList.add('pointer-events-none', 'opacity-70');
    errorDiv.classList.add('hidden');
    
    try {
        let result;
        if (modalAuthMode === 'login') {
            result = await supabaseClient.auth.signInWithPassword({ email, password });
        } else {
            result = await supabaseClient.auth.signUp({ email, password });
        }
        
        if (result.error) throw result.error;
        
        currentUser = result.data.user || result.data.session?.user;
        
        if (modalAuthMode === 'register' && !result.data.session) {
            errorDiv.classList.remove('hidden');
            errorDiv.className = 'bg-green-500/10 border border-green-500/30 text-green-500 text-xs p-3 rounded-lg flex items-center';
            errorText.innerText = '¡Cuenta creada! Revisa tu email para verificar.';
            btn.innerHTML = '<span>Entrar y Continuar</span>';
            btn.classList.remove('pointer-events-none', 'opacity-70');
            return;
        }
        
        // Success — go to step 3
        goToModalStep(3);
        
    } catch(e) {
        errorDiv.classList.remove('hidden');
        errorDiv.className = 'bg-red-500/10 border border-red-500/30 text-red-500 text-xs p-3 rounded-lg flex items-center';
        errorText.innerText = e.message || 'Error de autenticación.';
    }
    
    btn.innerHTML = modalAuthMode === 'login' ? '<span>Entrar y Continuar</span>' : '<span>Crear Cuenta y Continuar</span>';
    btn.classList.remove('pointer-events-none', 'opacity-70');
}

function completeMembership(btn) {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Procesando...';
    btn.classList.add('pointer-events-none', 'opacity-70');
    
    setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> ¡Suscripción Completada!';
        btn.classList.remove('opacity-70');
        btn.classList.remove('bg-brand', 'hover:bg-brand-hover');
        btn.classList.add('bg-green-500');
        
        setTimeout(() => {
            closeMembershipModal();
            btn.innerHTML = originalHTML;
            btn.classList.remove('pointer-events-none', 'bg-green-500');
            btn.classList.add('bg-brand', 'hover:bg-brand-hover');
            alert('🎉 ¡Bienvenido a Shidy\'s Fit! Tu suscripción ha sido activada.');
        }, 1500);
    }, 2000);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMembershipModal();
});
function switchProfileTab(tabName) {
    // 1. Ocultar todos los tabs
    const allContents = document.querySelectorAll('.profile-tab-content');
    allContents.forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });

    // 2. Desactivar estilo visual de todos los botones
    const allBtns = document.querySelectorAll('.profile-tab-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('bg-brand/10', 'text-brand', 'border', 'border-brand/30');
        btn.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-dark-800');
    });

    // 3. Mostrar el tab objetivo
    const targetEl = document.getElementById(`tab-${tabName}`);
    if (targetEl) {
        targetEl.classList.remove('hidden');
        targetEl.classList.add('block');
    }

    // 4. Activar estilo visual del botón objetivo
    const targetBtn = document.getElementById(`btn-tab-${tabName}`);
    if (targetBtn) {
        targetBtn.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-dark-800');
        targetBtn.classList.add('bg-brand/10', 'text-brand', 'border', 'border-brand/30');
    }
}

// ==========================================
// ADMIN DASHBOARD LOGIC
// ==========================================

let adminCachedUsers = [];
let revenueChart = null;
let classesChart = null;
let currentAdminFilter = 'month';

function setAdminTimeFilter(filter) {
    currentAdminFilter = filter;
    // Actualizar botones
    document.querySelectorAll('.admin-time-btn').forEach(btn => {
        btn.classList.remove('bg-brand', 'text-white');
        btn.classList.add('text-gray-400');
        
        const text = btn.innerText.toLowerCase();
        if ((filter === 'today' && text.includes('hoy')) || 
            (filter === 'week' && text.includes('7d')) || 
            (filter === 'month' && text.includes('30d'))) {
            btn.classList.add('bg-brand', 'text-white');
            btn.classList.remove('text-gray-400');
        }
    });
    initAdmin();
}

async function initAdmin() {
    if (!supabaseClient || currentUserProfile?.role !== 'admin') {
        navigate('home');
        return;
    }

    // 1. Mostrar estado de carga en la tabla si es necesario
    const userListContainer = document.getElementById('admin-users-list');
    if (userListContainer) {
        userListContainer.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                    <i class="fa-solid fa-spinner fa-spin text-2xl mb-4 text-brand"></i>
                    <p class="text-sm font-bold uppercase tracking-widest">Sincronizando con la base de datos...</p>
                </td>
            </tr>
        `;
    }

    try {
        // 2. Cargar Datos en Paralelo (Añadiendo transacciones)
        const [usersRes, reservationsRes, transactionsRes] = await Promise.all([
            supabaseClient.from('profiles').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('class_reservations').select('*'),
            supabaseClient.from('transactions').select('*').order('fecha', { ascending: true })
        ]);

        if (usersRes.error) throw usersRes.error;

        const users = usersRes.data || [];
        const reservations = reservationsRes.data || [];
        const transactions = transactionsRes.data || [];
        
        adminCachedUsers = users;

        // 3. Calcular Estadísticas Avanzadas (Considerando el filtro actual)
        const totalUsers = users.length;
        const activeMembers = users.filter(u => u.payment_status === 'paid' || u.payment_status === 'vip').length;
        
        const now = new Date();
        let startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Default: Mes a la fecha
        
        if (currentAdminFilter === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (currentAdminFilter === 'week') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        }

        const periodTransactions = transactions.filter(t => new Date(t.fecha) >= startDate && t.estado === 'succeeded');
        const periodRevenue = periodTransactions.reduce((sum, t) => sum + (t.monto / 100), 0); 

        // Reservas del periodo
        const periodReservations = reservations.filter(r => new Date(r.created_at) >= startDate);
        const todayStr = now.toISOString().split('T')[0];
        const todayReservations = reservations.filter(r => r.created_at.startsWith(todayStr)).length;

        // 4. Actualizar UI de Stats Cards
        const statUsers = document.getElementById('admin-stat-users');
        const statActive = document.getElementById('admin-stat-active-members');
        const statRevenue = document.getElementById('admin-stat-revenue');
        const statRes = document.getElementById('admin-stat-reservations');

        if (statUsers) statUsers.innerText = totalUsers;
        if (statActive) statActive.innerText = activeMembers;
        if (statRevenue) statRevenue.innerText = periodRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €';
        if (statRes) statRes.innerText = todayReservations;

        // 5. Renderizar Gráficas (Siempre últimos 30 días para tendencia, pero popularidad puede ser del periodo)
        renderAdminCharts(transactions, periodReservations);

        // 6. Renderizar Tabla de Usuarios
        renderAdminUsers(users);

    } catch (err) {
        console.error('Error cargando datos de admin:', err);
        if (userListContainer) {
            userListContainer.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500 font-bold uppercase tracking-widest">Error al cargar datos</td></tr>`;
        }
    }
}

function renderAdminCharts(transactions, reservations) {
    // A. Gráfica de Ingresos (Últimos 30 días)
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        if (revenueChart) revenueChart.destroy();
        
        const last30Days = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last30Days[d.toISOString().split('T')[0]] = 0;
        }

        transactions.forEach(t => {
            const date = t.fecha.split('T')[0];
            if (last30Days.hasOwnProperty(date)) {
                last30Days[date] += (t.monto / 100);
            }
        });

        revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: Object.keys(last30Days).map(d => d.split('-').slice(1).reverse().join('/')),
                datasets: [{
                    label: 'Ingresos (€)',
                    data: Object.values(last30Days),
                    borderColor: '#FF3366',
                    backgroundColor: 'rgba(255, 51, 102, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointBackgroundColor: '#FF3366'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#666', font: { size: 10 } }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: '#666', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }
                    }
                }
            }
        });
    }

    // B. Gráfica de Popularidad de Clases
    const classesCtx = document.getElementById('classesChart');
    if (classesCtx) {
        if (classesChart) classesChart.destroy();

        const classCounts = {};
        reservations.forEach(r => {
            classCounts[r.class_name] = (classCounts[r.class_name] || 0) + 1;
        });

        const sortedClasses = Object.entries(classCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        classesChart = new Chart(classesCtx, {
            type: 'bar',
            data: {
                labels: sortedClasses.map(c => c[0]),
                datasets: [{
                    label: 'Reservas',
                    data: sortedClasses.map(c => c[1]),
                    backgroundColor: ['#FF3366', '#00F0FF', '#F97316', '#A855F7', '#10B981'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#666' }
                    },
                    y: { 
                        grid: { display: false },
                        ticks: { color: '#fff', font: { weight: 'bold', size: 11 } }
                    }
                }
            }
        });
    }
}

function renderAdminUsers(users) {
    const list = document.getElementById('admin-users-list');
    if (!list) return;

    if (users.length === 0) {
        list.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-widest">No hay usuarios encontrados</td></tr>`;
        return;
    }

    list.innerHTML = users.map(user => {
        const isUserAdmin = user.role === 'admin';
        const paymentClass = user.payment_status === 'paid' ? 'text-green-500 bg-green-500/10' : 
                           user.payment_status === 'pending' ? 'text-yellow-500 bg-yellow-500/10' : 'text-red-500 bg-red-500/10';
        
        const avatarInitial = (user.username || user.full_name || 'U').charAt(0).toUpperCase();

        return `
            <tr class="hover:bg-white/5 transition-colors group">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="h-9 w-9 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm mr-3 border border-brand/10">
                            ${avatarInitial}
                        </div>
                        <div>
                            <div class="text-sm font-bold text-white flex items-center">
                                ${user.username || 'Sin usuario'}
                                ${isUserAdmin ? '<i class="fa-solid fa-crown ml-2 text-yellow-500 text-[10px]"></i>' : ''}
                            </div>
                            <div class="text-[10px] text-gray-400 capitalize">${user.full_name || 'Sin nombre real'}</div>
                            <div class="text-[9px] text-gray-600 font-mono mt-0.5">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${isUserAdmin ? 'bg-brand text-white' : 'bg-dark-900 text-gray-500 border border-white/10'}">
                        ${user.role}
                    </span>
                    <div class="text-[9px] text-gray-600 mt-1 font-mono">${user.id.substring(0,8)}...</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-[11px] text-white font-bold tracking-wide">${user.phone || '<span class="text-gray-600">No tlf</span>'}</div>
                    <div class="text-[9px] text-gray-500 mt-0.5">${user.birth_date || ''}</div>
                </td>
                <td class="px-6 py-4">
                    <select onchange="updatePaymentStatus('${user.id}', this.value)" class="bg-dark-900 text-[10px] font-bold uppercase rounded border border-white/10 px-2 py-1 outline-none ${paymentClass} cursor-pointer">
                        <option value="pending" ${user.payment_status === 'pending' ? 'selected' : ''}>⏳ Pendiente</option>
                        <option value="paid" ${user.payment_status === 'paid' ? 'selected' : ''}>✅ Pagado</option>
                        <option value="overdue" ${user.payment_status === 'overdue' ? 'selected' : ''}>⚠️ Impago</option>
                        <option value="cancelled" ${user.payment_status === 'cancelled' ? 'selected' : ''}>❌ Cancelado</option>
                    </select>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="toggleAdminRole('${user.id}', '${user.role}')" title="Alternar Admin" class="h-8 w-8 rounded bg-dark-900 border border-white/10 text-gray-400 hover:text-brand transition-colors flex items-center justify-center">
                            <i class="fa-solid fa-user-shield text-xs"></i>
                        </button>
                        <button onclick="deleteUser('${user.id}')" title="Eliminar Usuario" class="h-8 w-8 rounded bg-dark-900 border border-white/10 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterAdminUsers() {
    const query = document.getElementById('admin-user-search').value.toLowerCase();
    const filtered = adminCachedUsers.filter(u => 
        (u.username || '').toLowerCase().includes(query) || 
        (u.full_name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.phone || '').toLowerCase().includes(query) ||
        u.id.toLowerCase().includes(query)
    );
    renderAdminUsers(filtered);
}

async function updatePaymentStatus(userId, newStatus) {
    if (!confirm(`¿Cambiar estado de pago a ${newStatus.toUpperCase()}?`)) {
        initAdmin(); // Reset UI
        return;
    }

    const { error } = await supabaseClient
        .from('profiles')
        .update({ payment_status: newStatus })
        .eq('id', userId);

    if (error) {
        alert('Error al actualizar: ' + error.message);
    }
    initAdmin(); // Refrescar datos
}

async function toggleAdminRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    if (!confirm(`¿Cambiar rol a ${newRole.toUpperCase()}?`)) return;

    if (userId === currentUser.id && currentRole === 'admin') {
        if (!confirm('¡Estás a punto de quitarte tu propio permiso de admin! ¿Estás seguro?')) return;
    }

    const { error } = await supabaseClient
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) {
        alert('Error: ' + error.message);
    }
    initAdmin();
}

async function deleteUser(userId) {
    if (!confirm('¿ESTÁS SEGURO? Esta acción eliminará el perfil del usuario de la base de datos (nota: el usuario en Auth seguirá existiendo pero no tendrá acceso a sus datos).')) return;

    const { error } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) {
        alert('Error: ' + error.message);
    }
    initAdmin();
}

async function syncAdminProfiles() {
    if (!currentUser || currentUserProfile?.role !== 'admin') return;
    
    // Si se llama desde un evento, el target es el botón
    const btn = event?.currentTarget || document.querySelector('[onclick="syncAdminProfiles()"]');
    const originalHTML = btn ? btn.innerHTML : '<i class="fa-solid fa-sync mr-2"></i> Sincronizar Usuarios';
    
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Sincronizando...';
        btn.classList.add('pointer-events-none', 'opacity-70');
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/checkout/sync-profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: currentUser.id })
        });

        const data = await response.json();
        if (data.success) {
            alert('✅ ' + data.message);
            initAdmin(); 
        } else {
            throw new Error(data.error || 'Error en la sincronización');
        }
    } catch (err) {
        console.error('❌ Error sincronizando perfiles:', err);
        alert('⚠️ ' + err.message);
    } finally {
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.classList.remove('pointer-events-none', 'opacity-70');
        }
    }
}

// Registro de Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('🚀 Service Worker registrado con éxito:', reg.scope))
            .catch(err => console.error('❌ Fallo al registrar Service Worker:', err));
        
        // Manejar redirecciones de Stripe
        handlePaymentRedirects();
    });
} else {
    window.addEventListener('load', handlePaymentRedirects);
}

async function handlePaymentRedirects() {
    const hash = window.location.hash;
    if (hash.includes('#success')) {
        // Extraer session_id del hash (Stripe lo añade después del #success?session_id=...)
        const urlParams = new URLSearchParams(hash.split('?')[1]);
        const sessionId = urlParams.get('session_id');

        // Limpiar hash sin recargar para que no se quede el success en la barra
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
        
        if (sessionId) {
            console.log('🔍 Verificando sesión de pago:', sessionId);
            try {
                const response = await fetch(`${BACKEND_URL}/api/checkout/verify-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId })
                });
                const data = await response.json();
                
                if (data.success) {
                    console.log('✅ Pago verificado exitosamente');
                    alert('🎉 ¡Pago verificado! Tu suscripción se ha activado correctamente.');
                } else {
                    alert('⏳ Pago en proceso: ' + (data.message || 'Verificando...'));
                }
            } catch (err) {
                console.error('❌ Error de conexión al verificar:', err);
                alert('🎉 ¡Pago completado! (La actualización visual tardará unos segundos)');
            }
        } else {
            alert('🎉 ¡Pago verificado! Tu suscripción se está procesando.');
        }

        // Refrescar perfil inmediatamente para que la UI cambie
        if (currentUser) {
            const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
            if (data) {
                currentUserProfile = data;
                // Si estamos viendo la pestaña de suscripción, actualizarla
                if (document.getElementById('tab-subscription')) {
                    updateSubscriptionUI();
                }
                // Si estamos en perfil, refrescar vista completa
                if (currentTab === 'profile') {
                    showProfile();
                }
            }
        }
        
        // IR AL INICIO: Para evitar que la pantalla se quede vacía tras limpiar el hash
        navigate('home');
    } else if (hash.includes('#cancelled')) {
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
        alert('ℹ️ El proceso de pago fue cancelado. No se ha realizado ningún cargo.');
        navigate('home');
    }
}

// Fin de app.js
