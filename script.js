/**
 * Calculadora de Liquidación Laboral — El Salvador
 * Fórmulas basadas en el Código de Trabajo (Decreto N° 15, 1972) y en la
 * Ley Reguladora de la Prestación Económica por Renuncia Voluntaria (2014).
 *
 * Convenciones (Juzgados de lo Laboral):
 *  - Mes comercial = 30 días; año comercial = 360 días; jornada = 8 horas.
 *  - La antigüedad INCLUYE el último día laborado.
 *  - VACACIONES (Arts. 177, 187 y 190 CT): la pregunta cubre únicamente la
 *    del período anterior (último año completo de servicio). Si no fue
 *    pagada, se incluye como vencida (un período de 15 días + 30 %) más la
 *    fracción del año en curso; si fue pagada, solo la fracción del año en
 *    curso.
 *  - AGUINALDO (Arts. 196–198 CT): se devenga del 12 de diciembre de un año
 *    al 11 de diciembre del siguiente. Si el de diciembre pasado fue pagado,
 *    solo se calcula el proporcional del período actual (fracción de año);
 *    si NO fue pagado, se incluye además el vencido del año anterior.
 *  - RENUNCIA VOLUNTARIA (Ley 592, Art. 2): preaviso escrito de 30 días
 *    (dirección, jefatura o especializado — "Gerente") o 15 días (común);
 *    mínimo 2 años de servicio continuo. Sin un requisito, la prestación
 *    no procede (la vacación y el aguinaldo NO se pierden).
 *
 * Topes de ley: se usan contra el salario mínimo legal SEGÚN LA NATURALEZA DE LA EMPRESA
 * (Decreto Ejecutivo N.º 11, reformado por Decreto N.º 12, vigente desde 1/06/2025).
 *
 * Tabla de retención de ISR: Decreto Legislativo N.º 293 (30 de abril de 2025).
 *
 * Comisiones: Arts. 183 y 199 CT — se usan en el cálculo de prestaciones con el
 * promedio de los salarios ordinarios de los últimos 6 meses.
 */

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const fmtFrac = (n) => {
  let s = n.toFixed(4);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
};

const fmtDate = (isoStr) => {
  if (!isoStr) return '— No especificada —';
  const [y, m, d] = isoStr.split('-');
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
};

const setTxt = (id, txt) => {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
};

/* =========================================================
 * TABLA DE SALARIOS MÍNIMOS POR NATURALEZA DE LA EMPRESA
 * Decreto Ejecutivo N.º 11, reformado por Decreto N.º 12 (vigente desde 1/06/2025)
 * ========================================================= */
const SALARIOS_MINIMOS = {
  comercio: { valor: 408.80, etiqueta: 'Comercio y servicios', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  maquila: { valor: 402.32, etiqueta: 'Maquila textil y confección', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  industria: { valor: 408.80, etiqueta: 'Industria', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  ingenios: { valor: 408.80, etiqueta: 'Ingenios azucareros', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  agroindustria: { valor: 408.80, etiqueta: 'Agroindustria', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  beneficiosCafe: { valor: 305.23, etiqueta: 'Beneficios de café', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  agropecuario: { valor: 272.53, etiqueta: 'Sector agropecuario, pesca y otras actividades agrícolas', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  recoleccionCana: { valor: 305.23, etiqueta: 'Recolección de caña de azúcar', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  recoleccionCafe: { valor: 272.53, etiqueta: 'Recolección de café', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  domicilioComercio: { valor: 408.80, etiqueta: 'Trabajo a domicilio — Comercio y servicios', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  domicilioMaquila: { valor: 402.32, etiqueta: 'Trabajo a domicilio — Maquila y confección', decreto: 'Decreto Ejec. N.º 11/12 (2025)' },
  domicilioIndustria: { valor: 408.80, etiqueta: 'Trabajo a domicilio — Industria', decreto: 'Decreto Ejec. N.º 11/12 (2025)' }
};

const form = document.getElementById('calc-form');
const errorBox = document.getElementById('error-box');
const resultSection = document.getElementById('resultado');

// --- Referencias a los elementos ---
const naturalezaEmpresaSelect = document.getElementById('naturalezaEmpresa');
const salarioMinimoDisplay = document.getElementById('salarioMinimoDisplay');
const salarioMinimoHint = document.getElementById('salario-minimo-hint');

// --- Función para actualizar el salario mínimo mostrado ---
function actualizarSalarioMinimo() {
  const key = naturalezaEmpresaSelect.value;
  const sm = SALARIOS_MINIMOS[key];
  if (sm) {
    salarioMinimoDisplay.value = sm.valor.toFixed(2);
    salarioMinimoHint.textContent = `${sm.etiqueta} — ${sm.decreto}`;
  }
}
naturalezaEmpresaSelect.addEventListener('change', actualizarSalarioMinimo);
actualizarSalarioMinimo(); // Inicializar

// --- Toggle para mostrar/ocultar el campo de comisiones ---
const comisionesSiRadio = document.getElementById('comisiones-si');
const comisionesNoRadio = document.getElementById('comisiones-no');
const comisionesMontoBox = document.getElementById('comisiones-monto-box');

comisionesSiRadio.addEventListener('change', () => {
  if (comisionesSiRadio.checked) comisionesMontoBox.classList.remove('hidden');
});
comisionesNoRadio.addEventListener('change', () => {
  if (comisionesNoRadio.checked) comisionesMontoBox.classList.add('hidden');
});

// --- "No aplica" toggles: disable and zero the paired numeric field ---
document.querySelectorAll('[data-skip]').forEach((checkbox) => {
  const targetId = checkbox.dataset.skip;
  const input = document.getElementById(targetId);
  checkbox.addEventListener('change', () => {
    input.disabled = checkbox.checked;
    if (checkbox.checked) input.value = 0;
  });
});

const aniosInput = document.getElementById('anios');
const mesesInput = document.getElementById('meses');
const mesesHint = document.getElementById('meses-hint');
const fechaIngresoInput = document.getElementById('fechaIngreso');
const fechaTerminacionInput = document.getElementById('fechaTerminacion');

const toISO = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Antigüedad exacta (años, meses, días) entre dos fechas ISO, INCLUYENDO el
 * último día laborado. Devuelve null si faltan datos o si la terminación no es
 * posterior al ingreso.
 */
function diffFechas(isoIngreso, isoTerminacion) {
  if (!isoIngreso || !isoTerminacion) return null;
  const ingreso = new Date(isoIngreso + 'T00:00:00');
  const term = new Date(isoTerminacion + 'T00:00:00');
  if (isNaN(ingreso) || isNaN(term) || term <= ingreso) return null;

  let anios = term.getFullYear() - ingreso.getFullYear();
  let meses = term.getMonth() - ingreso.getMonth();
  let dias = term.getDate() - ingreso.getDate();

  if (dias < 0) {
    meses -= 1;
    const ultimoDiaMesAnterior = new Date(term.getFullYear(), term.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
    if (dias < 0) {
      meses -= 1;
      dias += 30;
    }
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  dias += 1;
  if (dias >= 30) { dias -= 30; meses += 1; }
  if (meses >= 12) { meses -= 12; anios += 1; }

  return { anios, meses, dias };
}

/**
 * 12 de diciembre más reciente anterior (o igual) a la terminación:
 * presunción de la fecha del último corte de aguinaldo (Arts. 196–198 CT).
 */
function dec12Reciente(isoTerminacion) {
  const term = new Date(isoTerminacion + 'T00:00:00');
  let base = new Date(term.getFullYear(), 11, 12);
  if (term < base) base = new Date(term.getFullYear() - 1, 11, 12);
  return base;
}

/* =========================================================
 * RENUNCIA VOLUNTARIA — requisitos de la Ley 592 (Art. 2)
 * ========================================================= */
const tipoEmpleadoSelect = document.getElementById('tipoEmpleado');
const preavisoDiasInput = document.getElementById('preavisoDias');

function actualizarPreavisoHint() {
  const gerente = tipoEmpleadoSelect.value === 'gerente';
  const req = gerente ? 30 : 15;
  document.getElementById('preaviso-hint').textContent =
    `Requeridos por ley: ${req} días de anticipación (${gerente ? 'cargo de dirección, jefatura o trabajador especializado' : 'demás trabajadores'}). Art. 2, Ley 592.`;
}

function actualizarRenunciaHint() {
  const hint = document.getElementById('renuncia-requisitos-hint');
  const checked = document.querySelector('input[name="causa"]:checked');
  const esRenuncia = !!checked && checked.value === 'renuncia';
  document.getElementById('renuncia-box').classList.toggle('hidden', !esRenuncia);
  if (!esRenuncia) {
    hint.textContent = '';
    hint.className = 'field-hint hidden';
    return;
  }
  const calc = diffFechas(fechaIngresoInput.value, fechaTerminacionInput.value);
  let total = null;
  if (calc) {
    total = calc.anios + (calc.meses * 30 + calc.dias) / 360;
  } else {
    const a = parseFloat(aniosInput.value);
    if (!isNaN(a)) {
      const m = parseFloat(mesesInput.value);
      total = a + (isNaN(m) ? 0 : (m * 30) / 360);
    }
  }
  const req = tipoEmpleadoSelect.value === 'gerente' ? 30 : 15;
  const dias = Math.max(parseInt(preavisoDiasInput.value, 10) || 0, 0);
  const cumplePre = dias >= req;
  let txt;
  if (total === null) {
    txt = `Requisitos (Art. 2, Ley 592): preaviso escrito de ${req} días — ${cumplePre ? 'CUMPLE' : 'NO CUMPLE'} (${dias} día(s)). Ingrese las fechas o la antigüedad para verificar el mínimo de 2 años de servicio.`;
  } else {
    const cumpleAnios = total >= 2;
    txt = `Requisitos (Art. 2, Ley 592): mínimo 2 años de servicio — ${cumpleAnios ? 'CUMPLE' : 'NO CUMPLE'} (${total.toFixed(2)} años); preaviso escrito de ${req} días — ${cumplePre ? 'CUMPLE' : 'NO CUMPLE'} (${dias} día(s)).` +
      ((!cumpleAnios || !cumplePre) ? ' La prestación por renuncia NO procede si no se cumple un requisito.' : '');
  }
  hint.textContent = txt;
  hint.className = ((total !== null && total < 2) || !cumplePre) ? 'mnote mnote--alert mt-3' : 'field-hint';
}

document.querySelectorAll('input[name="causa"]').forEach((r) => {
  r.addEventListener('change', actualizarRenunciaHint);
});
tipoEmpleadoSelect.addEventListener('change', () => {
  actualizarPreavisoHint();
  actualizarRenunciaHint();
});
preavisoDiasInput.addEventListener('input', actualizarRenunciaHint);
aniosInput.addEventListener('input', actualizarRenunciaHint);
mesesInput.addEventListener('input', actualizarRenunciaHint);

function sincronizarAntiguedadPorFechas() {
  const calc = diffFechas(fechaIngresoInput.value, fechaTerminacionInput.value);
  if (calc) {
    aniosInput.value = calc.anios;
    mesesInput.value = calc.meses;
    aniosInput.readOnly = true;
    mesesInput.readOnly = true;
    mesesHint.textContent = `Calculado de las fechas: ${calc.anios} años, ${calc.meses} meses` +
      `${calc.dias > 0 ? ` y ${calc.dias} días` : ''} (incluye el último día laborado).`;
  } else {
    aniosInput.readOnly = false;
    mesesInput.readOnly = false;
    mesesHint.textContent = 'Fracción del año actual (0–11)';
  }
  actualizarRenunciaHint();
}
fechaIngresoInput.addEventListener('change', sincronizarAntiguedadPorFechas);
fechaTerminacionInput.addEventListener('change', sincronizarAntiguedadPorFechas);

/* Estado inicial de los controles nuevos */
actualizarPreavisoHint();
actualizarRenunciaHint();

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  resultSection.classList.add('hidden');
}

function clearError() {
  errorBox.classList.add('hidden');
  errorBox.textContent = '';
}

function diasAguinaldoPorAntiguedad(anios) {
  if (anios < 3) return 15;
  if (anios <= 10) return 19;
  return 21;
}

/* ---------- Monto en letras (español, formato de comprobante legal) ---------- */
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function apocope(str) {
  if (str === 'veintiuno') return 'veintiún';
  if (str.endsWith(' uno')) return str.slice(0, -3) + 'un';
  return str;
}

function convertirGrupo(n) {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  let out = '';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) out += CENTENAS[c] + ' ';
  if (resto > 0) {
    if (resto <= 20) {
      out += UNIDADES[resto];
    } else if (resto < 30) {
      out += 'veinti' + UNIDADES[resto - 20];
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      out += DECENAS[d];
      if (u > 0) out += ' y ' + UNIDADES[u];
    }
  }
  return out.trim();
}

function numeroALetras(num) {
  num = Math.floor(num);
  if (num === 0) return 'cero';

  let out = '';
  const millones = Math.floor(num / 1000000);
  const resto1 = num % 1000000;
  const miles = Math.floor(resto1 / 1000);
  const cientos = resto1 % 1000;

  if (millones > 0) {
    out += millones === 1 ? 'un millón ' : apocope(convertirGrupo(millones)) + ' millones ';
  }
  if (miles > 0) {
    out += miles === 1 ? 'mil ' : apocope(convertirGrupo(miles)) + ' mil ';
  }
  if (cientos > 0) {
    out += convertirGrupo(cientos);
  }
  return out.trim();
}

function montoEnLetras(monto) {
  const entero = Math.floor(monto + 1e-9);
  const centavos = Math.round((monto - entero) * 100);
  const centavosStr = String(centavos).padStart(2, '0');
  return `${numeroALetras(entero).toUpperCase()} ${centavosStr}/100 DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA`;
}

/* ---------- Tabla de retención de ISR (Art. 37 Ley de ISR, tabla mensual) ---------- */
function calcularISR(rentaGravable) {
  if (rentaGravable <= 550.00) return 0;
  if (rentaGravable <= 895.24) return 17.67 + (rentaGravable - 550.00) * 0.10;
  if (rentaGravable <= 2038.10) return 60.00 + (rentaGravable - 895.24) * 0.20;
  return 288.57 + (rentaGravable - 2038.10) * 0.30;
}

function textoTramoISR(base) {
  if (base <= 550.00) return 'tramo I (hasta $550.00) → exento';
  if (base <= 895.24) return `tramo II: $17.67 + 10% × (${fmt.format(base)} − $550.00)`;
  if (base <= 2038.10) return `tramo III: $60.00 + 20% × (${fmt.format(base)} − $895.24)`;
  return `tramo IV: $288.57 + 30% × (${fmt.format(base)} − $2,038.10)`;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();

  /* =========================================================
   * I. DATOS FINANCIEROS Y ANTIGÜEDAD
   * ========================================================= */
  const nombreTrabajador = document.getElementById('nombreTrabajador').value.trim();
  const patrono = document.getElementById('patrono').value.trim();
  const cargo = document.getElementById('cargo').value.trim();
  const fechaIngreso = fechaIngresoInput.value;
  const fechaTerminacion = fechaTerminacionInput.value;

  const salario = parseFloat(document.getElementById('salario').value);
  const causa = document.querySelector('input[name="causa"]:checked').value;

  const naturalezaKey = naturalezaEmpresaSelect.value;
  const smInfo = SALARIOS_MINIMOS[naturalezaKey];
  const SALARIO_MINIMO_LEY = smInfo.valor;

  // Beneficios adicionales y requisitos de la renuncia
  const vacacionesPagadas = document.querySelector('input[name="vacacionesPagadas"]:checked').value === 'si';
  const aguinaldoPagado = document.querySelector('input[name="aguinaldoPagado"]:checked').value === 'si';
  const tipoEmpleado = tipoEmpleadoSelect.value; // 'comun' | 'gerente'
  const preavisoDias = Math.max(parseInt(preavisoDiasInput.value, 10) || 0, 0);
  const tieneComisiones = document.querySelector('input[name="tieneComisiones"]:checked').value === 'si';
  const comisionesMonto = tieneComisiones ? (parseFloat(document.getElementById('comisionesMonto').value) || 0) : 0;

  // Validaciones
  if (!salario || salario <= 0) return showError('Ingresa un salario mensual mayor a $0.');

  if (fechaIngreso && fechaTerminacion && !diffFechas(fechaIngreso, fechaTerminacion)) {
    return showError('La fecha de terminación debe ser posterior a la fecha de ingreso.');
  }
  const antiguedadPorFechas = diffFechas(fechaIngreso, fechaTerminacion);
  const anios = antiguedadPorFechas ? antiguedadPorFechas.anios : parseInt(aniosInput.value, 10);
  const meses = antiguedadPorFechas ? antiguedadPorFechas.meses : parseInt(mesesInput.value, 10);
  const diasExtra = antiguedadPorFechas ? antiguedadPorFechas.dias : 0;

  if (isNaN(anios) || anios < 0) return showError('Ingresa una cantidad válida de años laborados.');
  if (isNaN(meses) || meses < 0 || meses > 11) return showError('Los meses laborados deben estar entre 0 y 11.');
  if (tieneComisiones && comisionesMonto < 0) return showError('El monto de comisiones no puede ser negativo.');

  /* =========================================================
   * SALARIO BASE PARA PRESTACIONES (incluye comisiones)
   * ========================================================= */
  const salarioBasePrestaciones = salario + comisionesMonto;
  const SBD = salarioBasePrestaciones / 30;
  const H = SBD / 8;
  const fraccionAnio = (meses * 30 + diasExtra) / 360;
  const antiguedadTotal = anios + fraccionAnio;

  /* =========================================================
   * VACACIONES (Arts. 177, 187 y 190 CT)
   * - Si la del período anterior NO fue pagada: se incluye la vencida
   *   (un período completo de 15 días + 30 %) + la proporcional del año en curso.
   * - Si fue pagada: solo la proporcional del año en curso.
   * ========================================================= */
  const vacacionPeriodo = SBD * 15 * 1.3; // un período completo (15 días + 30 %)
  const vacacionVencida = (!vacacionesPagadas && anios >= 1) ? vacacionPeriodo : 0;
  const vacacionProporcional = vacacionPeriodo * fraccionAnio;

  // Textos para el comprobante y la metodología
  let vacvEstado = '', vacvPeriodo = '';
  if (vacacionesPagadas) {
    vacvEstado = 'Pagada — no se incluye';
    vacvPeriodo = 'ya disfrutada o pagada: solo se calcula la proporcional del año en curso';
  } else if (anios < 1) {
    vacvEstado = 'No pagada — no genera vencida';
    vacvPeriodo = 'antigüedad menor a 1 año: no hay período vencido';
  } else {
    vacvEstado = 'No pagada — se incluye como vencida';
    if (antiguedadPorFechas) {
      const startAnniv = new Date(fechaIngreso + 'T00:00:00');
      startAnniv.setFullYear(startAnniv.getFullYear() + (anios - 1));
      const endAnniv = new Date(fechaIngreso + 'T00:00:00');
      endAnniv.setFullYear(endAnniv.getFullYear() + anios);
      vacvPeriodo = `del ${fmtDate(toISO(startAnniv))} al ${fmtDate(toISO(endAnniv))} (último año completo de servicio)`;
    } else {
      vacvPeriodo = 'sin ambas fechas: se toma el último año completo de servicio';
    }
  }

  /* =========================================================
   * AGUINALDO (Arts. 196–198 CT)
   * - Si el de diciembre pasado NO fue pagado: se incluye el vencido
   *   (12-dic del año anterior al 11-dic) + el proporcional actual.
   * - Si fue pagado: solo el proporcional desde el 12 de diciembre pasado.
   * ========================================================= */
  const catAguTerm = diasAguinaldoPorAntiguedad(anios);
  let aguinaldoVencido = 0;
  let aguinaldoActual = 0;
  let aguvEstado = '—', aguvPeriodo = '—', aguvCat = '—', aguvFraccion = 0, aguvCalc = 'no aplica';
  let aguaBase = '—', aguaDetalle = '—', aguaFraccion = 0;

  if (antiguedadPorFechas) {
    const D1 = dec12Reciente(fechaTerminacion);                              // 12-dic más reciente
    const D1ISO = toISO(D1);
    const D0ISO = toISO(new Date(D1.getFullYear() - 1, 11, 12));             // inicio del vencido

    if (!aguinaldoPagado) {
      const startV = fechaIngreso > D0ISO ? fechaIngreso : D0ISO;
      if (startV < D1ISO) {
        const dV = diffFechas(startV, D1ISO);
        const aniosEnD1 = diffFechas(fechaIngreso, D1ISO);
        const catV = diasAguinaldoPorAntiguedad(aniosEnD1 ? aniosEnD1.anios : anios);
        let fracV = Math.min((dV.anios * 360 + dV.meses * 30 + dV.dias) / 360, 1);
        aguinaldoVencido = SBD * catV * fracV;
        aguvEstado = 'No pagado — se incluye como vencido';
        aguvPeriodo = startV === D0ISO
          ? `del ${fmtDate(D0ISO)} al ${fmtDate(D1ISO)} (año de aguinaldo completo)`
          : `del ${fmtDate(startV)} (fecha de ingreso) al ${fmtDate(D1ISO)}`;
        aguvCat = `${catV} días (antigüedad de ${aniosEnD1 ? aniosEnD1.anios : anios} año(s) al 12 de diciembre)`;
        aguvFraccion = fracV;
        aguvCalc = `${fmt.format(SBD)} × ${catV}`;
      } else {
        aguvEstado = 'No pagado — no genera aguinaldo vencido';
        aguvPeriodo = 'el ingreso es posterior al 11 de diciembre: no hay período vencido';
      }
    } else {
      aguvEstado = 'Pagado en diciembre pasado — no se incluye';
      aguvPeriodo = 'ya cubierto: del 12 de diciembre del año anterior al 11 de diciembre pasado';
    }

    const startA = fechaIngreso > D1ISO ? fechaIngreso : D1ISO;
    if (startA < fechaTerminacion) {
      const dA = diffFechas(startA, fechaTerminacion);
      aguaFraccion = Math.min((dA.anios * 360 + dA.meses * 30 + dA.dias) / 360, 1);
      aguinaldoActual = SBD * catAguTerm * aguaFraccion;
      aguaBase = startA === fechaIngreso
        ? `desde el ${fmtDate(fechaIngreso)} (ingreso posterior al 12 de diciembre)`
        : `desde el ${fmtDate(D1ISO)} (12 de diciembre pasado, presunción de último pago)`;
      aguaDetalle = `${dA.meses} mes${dA.meses === 1 ? '' : 'es'} y ${dA.dias} día${dA.dias === 1 ? '' : 's'} → (${dA.meses} × 30 + ${dA.dias}) ÷ 360`;
    } else {
      aguaBase = 'la terminación coincide con el 12 de diciembre → fracción 0';
      aguaDetalle = '—';
    }
  } else {
    // Sin ambas fechas: aproximación con meses comerciales
    if (!aguinaldoPagado && anios >= 1) {
      aguinaldoVencido = SBD * catAguTerm; // un año completo
      aguvEstado = 'No pagado — se incluye como vencido (aproximado)';
      aguvPeriodo = 'sin ambas fechas: se aproxima a un año de aguinaldo completo';
      aguvCat = `${catAguTerm} días (antigüedad de ${anios} año(s))`;
      aguvFraccion = 1;
      aguvCalc = `${fmt.format(SBD)} × ${catAguTerm}`;
    } else if (aguinaldoPagado) {
      aguvEstado = 'Pagado en diciembre pasado — no se incluye';
      aguvPeriodo = 'ya cubierto';
    } else {
      aguvEstado = 'No pagado — sin aguinaldo vencido (antigüedad menor a 1 año)';
      aguvPeriodo = 'no aplica';
    }
    aguinaldoActual = SBD * catAguTerm * fraccionAnio;
    aguaFraccion = fraccionAnio;
    aguaBase = 'sin ambas fechas → se aproxima con la fracción de antigüedad';
    aguaDetalle = `${meses} mes${meses === 1 ? '' : 'es'} → (${meses} × 30 + ${diasExtra}) ÷ 360`;
  }
  const aguinaldoTotal = aguinaldoVencido + aguinaldoActual;

  // Comisiones devengadas (últimos 6 meses) — monto total pendiente
  const totalComisiones = comisionesMonto * 6;

  /* =========================================================
   * Requisitos de la renuncia voluntaria (Ley 592, Art. 2)
   * ========================================================= */
  const diasPreavisoReq = tipoEmpleado === 'gerente' ? 30 : 15;
  const cumplePreaviso = preavisoDias >= diasPreavisoReq;
  const cumpleDosAnios = antiguedadTotal >= 2;

  let requisitosRenuncia = '';
  if (causa === 'renuncia') {
    requisitosRenuncia =
      `Requisitos de la renuncia voluntaria (Art. 2, Ley 592): mínimo 2 años de servicio continuo — ${cumpleDosAnios ? 'CUMPLE' : 'NO CUMPLE'} (${fmtFrac(antiguedadTotal)} años); ` +
      `preaviso escrito de ${diasPreavisoReq} días — ${cumplePreaviso ? 'CUMPLE' : 'NO CUMPLE'} (notificado con ${preavisoDias} día(s)). ` +
      `La renuncia debe constar por escrito, con copia del DUI, en formularios del Ministerio de Trabajo o de los Juzgados de lo Laboral, o en documento privado autenticado.`;
  }

  // Indemnización (despido) o prestación por renuncia, con topes de ley
  let montoCausa = 0;
  let notaCausa = '';
  let etiquetaCausa = '';
  let legalCausa = '';
  let exentoNota = '';
  let topeCausa = 0;
  let baseAnualCausa = 0;
  let minimoLegal = 0;
  let aplicaMinimo = false;

  if (causa === 'despido') {
    etiquetaCausa = 'Indemnización por despido injustificado';
    legalCausa = 'Art. 58 CT';
    exentoNota = 'indemnización y aguinaldos';
    topeCausa = SALARIO_MINIMO_LEY * 4;
    const salarioBaseIndemnizacion = Math.min(salarioBasePrestaciones, topeCausa);
    baseAnualCausa = salarioBaseIndemnizacion;
    montoCausa = salarioBaseIndemnizacion * anios + salarioBaseIndemnizacion * fraccionAnio;
    minimoLegal = SBD * 15;
    if (montoCausa < minimoLegal) {
      montoCausa = minimoLegal;
      aplicaMinimo = true;
    }
    if (salarioBasePrestaciones > topeCausa) {
      notaCausa = `Se aplicó el tope legal de 4 salarios mínimos (${fmt.format(topeCausa)}; salario mínimo de ${smInfo.etiqueta}: ${fmt.format(SALARIO_MINIMO_LEY)}) porque el salario base lo supera (Art. 58 CT).`;
    }
  } else {
    etiquetaCausa = 'Prestación económica por renuncia voluntaria';
    legalCausa = 'Ley de Prestación por Renuncia Voluntaria (2014), Arts. 2 y 4';
    exentoNota = 'prestación por renuncia y aguinaldos';
    if (!cumpleDosAnios) {
      montoCausa = 0;
      notaCausa = `No procede la prestación: la Ley Reguladora de la Prestación Económica por Renuncia Voluntaria exige un mínimo de 2 años de servicio continuo (Art. 2) y la antigüedad registrada es de ${fmtFrac(antiguedadTotal)} años. Con esa antigüedad NO puede aplicar a la renuncia voluntaria; no obstante, se conservan la vacación y el aguinaldo que correspondan.`;
    } else if (!cumplePreaviso) {
      montoCausa = 0;
      notaCausa = `No procede la prestación: el Art. 2 de la Ley 592 exige notificar la renuncia por escrito con ${diasPreavisoReq} días de anticipación y solo se declararon ${preavisoDias} día(s).`;
    } else {
      topeCausa = SALARIO_MINIMO_LEY * 2;
      const salarioBaseRenuncia = Math.min(salarioBasePrestaciones, topeCausa);
      baseAnualCausa = salarioBaseRenuncia / 30 * 15;
      montoCausa = baseAnualCausa * anios + baseAnualCausa * fraccionAnio;
      if (salarioBasePrestaciones > topeCausa) {
        notaCausa = `Se aplicó el tope legal de 2 salarios mínimos (${fmt.format(topeCausa)}; salario mínimo de ${smInfo.etiqueta}: ${fmt.format(SALARIO_MINIMO_LEY)}) porque el salario base lo supera (Ley de Renuncia Voluntaria, Art. 4).`;
      }
    }
  }

  const heDiurnas = parseFloat(document.getElementById('heDiurnas').value) || 0;
  const heNocturnas = parseFloat(document.getElementById('heNocturnas').value) || 0;
  const diasAsueto = parseFloat(document.getElementById('diasAsueto').value) || 0;
  const diasDescanso = parseFloat(document.getElementById('diasDescanso').value) || 0;

  const subtotalHeDiurnas = H * heDiurnas * 2;
  const subtotalHeNocturnas = H * heNocturnas * 2 * 1.25;
  const montoAsueto = SBD * 2 * diasAsueto;
  const montoDescanso = SBD * 1.5 * diasDescanso;

  const totalDevengado = vacacionVencida + vacacionProporcional + aguinaldoVencido + aguinaldoActual +
    totalComisiones + montoCausa + subtotalHeDiurnas + subtotalHeNocturnas + montoAsueto + montoDescanso;

  /* =========================================================
   * DEDUCCIONES DE LEY Y NETO A PAGAR
   * ========================================================= */

  const montoExento = montoCausa + aguinaldoTotal;
  const remuneracionGravada = totalDevengado - montoExento;

  const ISSS_RATE = 0.03;
  const ISSS_TOPE = 1000;
  const AFP_RATE = 0.0725;

  const baseISSS = Math.min(remuneracionGravada, ISSS_TOPE);
  const cotizacionISSS = baseISSS * ISSS_RATE;
  const cotizacionAFP = remuneracionGravada * AFP_RATE;

  const baseISR = Math.max(remuneracionGravada - cotizacionISSS - cotizacionAFP, 0);
  const retencionISR = calcularISR(baseISR);

  const totalDeducciones = cotizacionISSS + cotizacionAFP + retencionISR;
  const montoNeto = totalDevengado - totalDeducciones;

  /* =========================================================
   * Notas sobre beneficios adicionales
   * ========================================================= */
  let notaBeneficios = '';
  notaBeneficios += vacacionesPagadas
    ? 'Vacación del período anterior: YA PAGADA — solo se incluye la proporcional del año en curso (Arts. 177 y 187 CT). '
    : (anios >= 1
      ? 'Vacación del período anterior: NO PAGADA — se incluye la vencida (15 días + 30 %) más la proporcional del año en curso (Arts. 177, 187 y 190 CT). '
      : 'Vacación: antigüedad menor a 1 año, no hay período vencido — solo se calcula la proporcional del año en curso (Art. 187 CT). ');
  notaBeneficios += aguinaldoPagado
    ? 'Aguinaldo de diciembre pasado: YA PAGADO — solo se incluye el proporcional del período actual (Arts. 196–198 CT). '
    : 'Aguinaldo de diciembre pasado: NO PAGADO — se incluye el vencido del año anterior más el proporcional del período actual (Arts. 196–198 CT). ';
  if (tieneComisiones && comisionesMonto > 0) {
    notaBeneficios += `Comisiones: se incluyen ${fmt.format(totalComisiones)} (promedio mensual de ${fmt.format(comisionesMonto)} × 6 meses, Arts. 183 y 199 CT). `;
  }
  if (comisionesMonto > 0) {
    notaBeneficios += `Las comisiones se sumaron al salario base para el cálculo de prestaciones: ${fmt.format(salario)} + ${fmt.format(comisionesMonto)} = ${fmt.format(salarioBasePrestaciones)} (Arts. 183 y 199 CT).`;
  }

  /* =========================================================
   * Pintar I. Datos de las partes (comprobante)
   * ========================================================= */
  document.getElementById('r-nombreTrabajador').textContent = nombreTrabajador || '— No especificada —';
  document.getElementById('r-patrono').textContent = patrono || '— No especificado —';
  document.getElementById('r-cargo').textContent = cargo || '— No especificado —';
  document.getElementById('r-salario').textContent = fmt.format(salario);
  document.getElementById('r-naturalezaEmpresa').textContent = smInfo.etiqueta;
  document.getElementById('r-salarioMinimo').textContent = fmt.format(SALARIO_MINIMO_LEY);
  document.getElementById('r-fechaIngreso').textContent = fechaIngreso ? fmtDate(fechaIngreso) : '— No especificada —';
  document.getElementById('r-fechaTerminacion').textContent = fechaTerminacion ? fmtDate(fechaTerminacion) : '— No especificada —';
  document.getElementById('r-antiguedad').textContent = diasExtra > 0
    ? `${anios} años, ${meses} meses, ${diasExtra} días`
    : `${anios} años, ${meses} meses`;
  document.getElementById('r-causaLabel2').textContent = causa === 'despido' ? 'Despido sin causa justificada' : 'Renuncia voluntaria';
  document.getElementById('r-vacacionesPagadas').textContent = vacacionesPagadas ? 'Pagada — solo año en curso' : 'No pagada — vencida + proporcional';
  document.getElementById('r-aguinaldoPagado').textContent = aguinaldoPagado ? 'Pagado — solo período actual' : 'No pagado — vencido + actual';
  document.getElementById('r-tipoEmpleado').textContent = causa === 'renuncia'
    ? (tipoEmpleado === 'gerente' ? 'Gerente — dirección, jefatura o especializado' : 'Común — demás trabajadores')
    : 'No aplica (despido)';
  document.getElementById('r-preaviso').textContent = causa === 'renuncia'
    ? `${preavisoDias} día(s) — requeridos ${diasPreavisoReq}: ${cumplePreaviso ? 'cumple' : 'NO cumple'}`
    : 'No aplica (despido)';
  document.getElementById('r-comisionesInfo').textContent = tieneComisiones && comisionesMonto > 0
    ? `${fmt.format(comisionesMonto)}/mes` : 'Sin comisiones';
  document.getElementById('r-salarioBasePrestaciones').textContent = fmt.format(salarioBasePrestaciones);

  /* =========================================================
   * Pintar II. Desglose de prestaciones liquidadas
   * ========================================================= */
  document.getElementById('r-vac-vencida').textContent = vacacionesPagadas
    ? '$0.00 (ya pagada)'
    : (vacacionVencida > 0 ? fmt.format(vacacionVencida) : '$0.00 (antigüedad menor a 1 año)');
  document.getElementById('r-vacacion').textContent = fmt.format(vacacionProporcional);
  document.getElementById('r-agu-vencida').textContent = aguinaldoPagado
    ? '$0.00 (ya pagado)'
    : (aguinaldoVencido > 0 ? fmt.format(aguinaldoVencido) : '$0.00 (no aplica)');
  document.getElementById('r-aguinaldo').textContent = fmt.format(aguinaldoActual);
  document.getElementById('r-comisiones').textContent = tieneComisiones && comisionesMonto > 0 ? fmt.format(totalComisiones) : '$0.00';
  document.getElementById('r-causa-label').textContent = etiquetaCausa;
  document.getElementById('r-causa-legal').textContent = legalCausa;
  document.getElementById('r-causa').textContent = fmt.format(montoCausa);
  document.getElementById('r-heDiurnas').textContent = fmt.format(subtotalHeDiurnas);
  document.getElementById('r-heNocturnas').textContent = fmt.format(subtotalHeNocturnas);
  document.getElementById('r-asueto').textContent = fmt.format(montoAsueto);
  document.getElementById('r-descanso').textContent = fmt.format(montoDescanso);
  document.getElementById('r-total').textContent = fmt.format(totalDevengado);
  document.getElementById('r-nota').textContent = notaCausa;
  const reqEl = document.getElementById('r-renuncia-requisitos');
  reqEl.textContent = requisitosRenuncia;
  reqEl.classList.toggle('hidden', causa !== 'renuncia');
  document.getElementById('r-nota-beneficios').textContent = notaBeneficios;

  /* =========================================================
   * Pintar III. Deducciones de ley y neto a pagar
   * ========================================================= */
  document.getElementById('r-gravada').textContent = fmt.format(remuneracionGravada);
  document.getElementById('r-exento').textContent = fmt.format(montoExento);
  document.getElementById('r-exento-nota').textContent = exentoNota;
  document.getElementById('r-isss').textContent = fmt.format(cotizacionISSS);
  document.getElementById('r-afp').textContent = fmt.format(cotizacionAFP);
  document.getElementById('r-isr').textContent = fmt.format(retencionISR);
  document.getElementById('r-deducciones').textContent = fmt.format(totalDeducciones);
  document.getElementById('r-neto').textContent = fmt.format(montoNeto);
  document.getElementById('r-neto-letras').textContent = montoEnLetras(montoNeto);

  /* =========================================================
   * Pintar IV. Declaración
   * ========================================================= */
  const nombreDecl = nombreTrabajador || 'La persona trabajadora';
  document.getElementById('r-declaracion').textContent =
    `${nombreDecl} declara haber recibido el detalle de las prestaciones económicas que anteceden, ` +
    `calculadas conforme al Código de Trabajo de El Salvador, así como el desglose de las retenciones de ley ` +
    `aplicadas y el monto neto resultante. Este comprobante se suscribe en la fecha que se indica al pie de las firmas.`;

  const ahora = new Date();
  document.getElementById('r-generado').textContent =
    `Generado el ${ahora.toLocaleDateString('es-SV')} ${ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`;

  /* =========================================================
   * Metodología dinámica: fórmulas con los datos del usuario
   * ========================================================= */

  // Convenciones y salario mínimo por naturaleza
  setTxt('m-naturaleza', smInfo.etiqueta);
  setTxt('m-salario-min', fmt.format(SALARIO_MINIMO_LEY));

  // B1–B4. Beneficios adicionales
  setTxt('m-vac-pagadas', vacacionesPagadas ? 'Ya fue pagada' : 'No ha sido pagada');
  setTxt('m-vac-pagadas-detalle', vacacionesPagadas
    ? 'Solo se calcula la vacación proporcional del año en curso (fracción de año, Art. 187 CT).'
    : (anios >= 1
      ? 'Se incluye la vacación vencida del período anterior (15 días + 30 %) más la proporcional del año en curso.'
      : 'Antigüedad menor a 1 año: no hay período vencido; solo se calcula la proporcional del año en curso.'));

  setTxt('m-agu-pagado', aguinaldoPagado ? 'Ya fue pagado' : 'No ha sido pagado');
  setTxt('m-agu-pagado-detalle', aguinaldoPagado
    ? 'Solo se devenga el aguinaldo proporcional del período actual, contado desde el 12 de diciembre pasado (Art. 196 CT).'
    : 'Se incluye el aguinaldo vencido de diciembre pasado (período del 12-dic del año anterior al 11-dic) más el proporcional del período actual.');

  setTxt('m-comisiones-info', tieneComisiones ? `Sí — ${fmt.format(comisionesMonto)}/mes promedio` : 'No');
  setTxt('m-comisiones-detalle', tieneComisiones && comisionesMonto > 0
    ? `Las comisiones integran el salario ordinario (Arts. 183 y 199 CT). Se usa el promedio mensual de los últimos 6 meses: ${fmt.format(comisionesMonto)}.`
    : 'No se incluyen comisiones en el cálculo.');

  setTxt('m-salario-base-calc', `${fmt.format(salario)} + ${fmt.format(comisionesMonto)}`);
  setTxt('m-salario-base', fmt.format(salarioBasePrestaciones));

  // 1–3. Bases (sobre salario base con comisiones)
  setTxt('m-sbd-calc', fmt.format(salarioBasePrestaciones));
  setTxt('m-sbd', fmt.format(SBD));
  setTxt('m-h-calc', fmt.format(SBD));
  setTxt('m-h', fmt.format(H));
  setTxt('m-antiguedad',
    `${anios} año${anios === 1 ? '' : 's'}, ${meses} mes${meses === 1 ? '' : 'es'}${diasExtra > 0 ? ` y ${diasExtra} día${diasExtra === 1 ? '' : 's'}` : ''}`);
  setTxt('m-fraccion-calc', `(${meses} × 30 + ${diasExtra}) ÷ 360`);
  setTxt('m-fraccion', fmtFrac(fraccionAnio));

  // 4. Vacación vencida del período anterior
  setTxt('m-vacv-estado', vacvEstado);
  setTxt('m-vacv-periodo', vacvPeriodo);
  setTxt('m-vacv-calc', `${fmt.format(SBD)} × 15 × 1.30`);
  setTxt('m-vacv', vacacionesPagadas ? '$0.00 (ya pagada)' : (vacacionVencida > 0 ? fmt.format(vacacionVencida) : '$0.00 (no aplica)'));

  // 5. Vacación proporcional del año en curso
  setTxt('m-vac-calc', `${fmt.format(SBD)} × 15 × 1.30`);
  setTxt('m-fraccion2', fmtFrac(fraccionAnio));
  setTxt('m-vac', fmt.format(vacacionProporcional));
  setTxt('m-vac-nota-pago', 'La fracción del año en curso se paga al terminar la relación, tanto en el despido (Art. 187 CT) como en la renuncia (Ley 592, Art. 4). El derecho a disfrutar cada período exige 200 días laborados en el año (Art. 178 CT).');

  // 6. Aguinaldo vencido (diciembre anterior)
  setTxt('m-aguv-estado', aguvEstado);
  setTxt('m-aguv-periodo', aguvPeriodo);
  setTxt('m-aguv-cat', aguvCat);
  setTxt('m-aguv-fraccion', fmtFrac(aguvFraccion));
  setTxt('m-aguv-fraccion2', fmtFrac(aguvFraccion));
  setTxt('m-aguv-calc', aguvCalc);
  setTxt('m-aguv', aguinaldoPagado ? '$0.00 (ya pagado)' : (aguinaldoVencido > 0 ? fmt.format(aguinaldoVencido) : '$0.00 (no aplica)'));

  // 7. Aguinaldo proporcional del período actual
  setTxt('m-agu-cat',
    `${catAguTerm} días de salario (${anios} año${anios === 1 ? '' : 's'} de servicio → ` +
    `${anios < 3 ? 'categoría 1: menos de 3 años' : anios <= 10 ? 'categoría 2: de 3 a 10 años' : 'categoría 3: más de 10 años'})`);
  setTxt('m-agu-base', aguaBase);
  setTxt('m-agu-detalle', aguaDetalle);
  setTxt('m-agu-fraccion', fmtFrac(aguaFraccion));
  setTxt('m-agu-fraccion2', fmtFrac(aguaFraccion));
  setTxt('m-agu-calc', `${fmt.format(SBD)} × ${catAguTerm}`);
  setTxt('m-agu', fmt.format(aguinaldoActual));
  setTxt('m-agu-nota-pago', aguinaldoPagado
    ? 'Nota: el aguinaldo de diciembre pasado fue pagado; únicamente se devenga el proporcional desde el 12 de diciembre.'
    : '');

  // 8. Comisiones
  setTxt('m-com-calc', `${fmt.format(comisionesMonto)} × 6`);
  setTxt('m-com', tieneComisiones && comisionesMonto > 0 ? fmt.format(totalComisiones) : '$0.00');

  // 9. Indemnización o prestación por renuncia (con requisitos de la Ley 592)
  setTxt('m-causa-nombre', etiquetaCausa);
  setTxt('m-causa-legal', legalCausa);
  setTxt('m-causa-intro', causa === 'despido'
    ? '30 días de salario por cada año de servicio y proporcionalmente por fracciones.'
    : '15 días de salario básico por cada año de servicio, proporcionalmente por fracciones (Ley 592, Art. 4).');
  const renDL = document.getElementById('m-ren-dl');
  if (causa === 'renuncia') {
    renDL.style.display = '';
    setTxt('m-ren-tipo', tipoEmpleado === 'gerente' ? 'Gerente — dirección, jefatura o especializado' : 'Común — demás trabajadores');
    setTxt('m-ren-preaviso-req', `${diasPreavisoReq} días (Art. 2 Ley 592)`);
    setTxt('m-ren-preaviso-dado', `${preavisoDias} día(s) — ${cumplePreaviso ? 'CUMPLE' : 'NO CUMPLE'}`);
    setTxt('m-ren-anios', `${fmtFrac(antiguedadTotal)} años — ${cumpleDosAnios ? 'CUMPLE' : 'NO CUMPLE'}`);
  } else {
    renDL.style.display = 'none';
  }
  let topeTxt;
  if (causa === 'despido') {
    topeTxt = `Tope legal (Art. 58 CT): 4 × salario mínimo de ${smInfo.etiqueta} = 4 × ${fmt.format(SALARIO_MINIMO_LEY)} = ${fmt.format(topeCausa)}. `;
    topeTxt += salarioBasePrestaciones > topeCausa
      ? `El salario base de ${fmt.format(salarioBasePrestaciones)} lo supera → se usa capado en ${fmt.format(topeCausa)}.`
      : `El salario base de ${fmt.format(salarioBasePrestaciones)} no lo supera → se usa íntegro.`;
    setTxt('m-causa-requisito', '');
  } else {
    const reqTxt = `Requisitos (Art. 2): mínimo 2 años de servicio continuo → la antigüedad total de ${fmtFrac(antiguedadTotal)} años ${cumpleDosAnios ? 'lo cumple.' : 'NO lo cumple → la prestación es $0.00.'} Preaviso escrito de ${diasPreavisoReq} días → ${cumplePreaviso ? 'cumple.' : 'NO cumple → la prestación es $0.00.'}`;
    setTxt('m-causa-requisito', reqTxt);
    if (!cumpleDosAnios || !cumplePreaviso) {
      topeTxt = '';
    } else {
      topeTxt = `Tope legal (Art. 4): 2 × salario mínimo de ${smInfo.etiqueta} = 2 × ${fmt.format(SALARIO_MINIMO_LEY)} = ${fmt.format(topeCausa)}. `;
      topeTxt += salarioBasePrestaciones > topeCausa
        ? `El salario base de ${fmt.format(salarioBasePrestaciones)} lo supera → se usa capado en ${fmt.format(topeCausa)}.`
        : `El salario base de ${fmt.format(salarioBasePrestaciones)} no lo supera → se usa íntegro.`;
    }
  }
  setTxt('m-causa-tope', topeTxt);
  if (causa === 'despido') {
    setTxt('m-causa-calc', `${fmt.format(baseAnualCausa)} × (${anios} + ${fmtFrac(fraccionAnio)})`);
  } else if (!cumpleDosAnios || !cumplePreaviso) {
    setTxt('m-causa-calc', 'no aplica');
  } else {
    setTxt('m-causa-calc', `${fmt.format(baseAnualCausa)} × (${anios} + ${fmtFrac(fraccionAnio)})`);
  }
  setTxt('m-causa-monto', fmt.format(montoCausa));
  if (causa === 'despido') {
    setTxt('m-causa-minimo', aplicaMinimo
      ? ` Mínimo legal (Art. 58 CT): 15 días de SBD = ${fmt.format(minimoLegal)}; el cálculo directo era menor → se elevó al mínimo.`
      : ` Mínimo legal (Art. 58 CT): 15 días de SBD = ${fmt.format(minimoLegal)}; el resultado lo supera → no aplica el ajuste.`);
  } else {
    setTxt('m-causa-minimo', '');
  }

  // 10–13. Jornadas extraordinarias y días especiales
  setTxt('m-hed-calc', `${fmt.format(H)} × ${heDiurnas} × 2`);
  setTxt('m-hed', fmt.format(subtotalHeDiurnas));
  setTxt('m-hen-calc', `${fmt.format(H)} × ${heNocturnas} × 2 × 1.25`);
  setTxt('m-hen', fmt.format(subtotalHeNocturnas));
  setTxt('m-asu-calc', `${fmt.format(SBD)} × 2 × ${diasAsueto}`);
  setTxt('m-asu', fmt.format(montoAsueto));
  setTxt('m-des-calc', `${fmt.format(SBD)} × 1.5 × ${diasDescanso}`);
  setTxt('m-des', fmt.format(montoDescanso));

  // 14. Total
  setTxt('m-total', fmt.format(totalDevengado));

  // 15–19. Deducciones
  setTxt('m-exento', fmt.format(montoExento));
  setTxt('m-gravada', fmt.format(remuneracionGravada));
  setTxt('m-isss-base', fmt.format(baseISSS));
  setTxt('m-isss', fmt.format(cotizacionISSS));
  setTxt('m-afp-base', fmt.format(remuneracionGravada));
  setTxt('m-afp', fmt.format(cotizacionAFP));
  setTxt('m-isr-base', fmt.format(baseISR));
  setTxt('m-isr-tramo', textoTramoISR(baseISR));
  setTxt('m-isr', fmt.format(retencionISR));
  setTxt('m-neto-calc',
    `${fmt.format(totalDevengado)} − (${fmt.format(cotizacionISSS)} + ${fmt.format(cotizacionAFP)} + ${fmt.format(retencionISR)})`);
  setTxt('m-neto', fmt.format(montoNeto));

  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('btn-print').addEventListener('click', () => window.print());
