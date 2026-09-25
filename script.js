/**
 * Calculadora de Liquidación Laboral — El Salvador
 * Fórmulas basadas en el Código de Trabajo (Decreto N° 15, 1972) y en la
 * Ley Reguladora de la Prestación Económica por Renuncia Voluntaria (2014).
 * Convención: mes comercial = 30 días, año comercial = 360 días,
 * jornada ordinaria = 8 horas (misma convención usada por los Juzgados de lo Laboral).
 *
 * Tabla de ISR actualizada al Decreto Legislativo No. 293 (abril 2025),
 * vigente desde mayo 2025 con límite exento de $550 mensuales.
 *
 * Las fórmulas del Bloque II (prestaciones) no se modifican al agregar
 * el Bloque III (deducciones de ley) — ver nota al final del archivo.
 */

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (isoStr) => {
  if (!isoStr) return '— No especificada —';
  const [y, m, d] = isoStr.split('-');
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
};

const form = document.getElementById('calc-form');
const errorBox = document.getElementById('error-box');
const resultSection = document.getElementById('resultado');

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

/**
 * Antigüedad exacta (años, meses, días de calendario) entre dos fechas ISO.
 * Devuelve null si faltan datos o si la terminación no es posterior al ingreso.
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
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  return { anios, meses, dias };
}

function sincronizarAntiguedadPorFechas() {
  const calc = diffFechas(fechaIngresoInput.value, fechaTerminacionInput.value);
  if (calc) {
    aniosInput.value = calc.anios;
    mesesInput.value = calc.meses;
    aniosInput.readOnly = true;
    mesesInput.readOnly = true;
    mesesHint.textContent = `Calculado de las fechas: ${calc.anios} años, ${calc.meses} meses y ${calc.dias} días.`;
  } else {
    aniosInput.readOnly = false;
    mesesInput.readOnly = false;
    mesesHint.textContent = 'Fracción del año actual (0–11)';
  }
}
fechaIngresoInput.addEventListener('change', sincronizarAntiguedadPorFechas);
fechaTerminacionInput.addEventListener('change', sincronizarAntiguedadPorFechas);

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  resultSection.classList.add('hidden');
}

const sectorSelect = document.getElementById('sectorSalarioMinimo');
const salarioMinimoCustom = document.getElementById('salarioMinimoCustom');
sectorSelect.addEventListener('change', () => {
  salarioMinimoCustom.classList.toggle('hidden', sectorSelect.value !== 'custom');
});

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

/* ---------- Tabla de retención de ISR — CORREGIDA ----------
 * Actualizada al Decreto Legislativo No. 293 (30 de abril de 2025),
 * vigente desde mayo 2025. Fuente: Ministerio de Hacienda, Dirección General de Impuestos Internos.
 * Tabla mensual para personas naturales:
 *   Tramo I:   $0.01    a $550.00    → Sin retención
 *   Tramo II:  $550.01  a $895.24    → Cuota fija $17.67 + 10% sobre exceso de $550.00
 *   Tramo III: $895.25  a $2,038.10  → Cuota fija $60.00 + 20% sobre exceso de $895.24
 *   Tramo IV:  $2,038.11 en adelante → Cuota fija $288.57 + 30% sobre exceso de $2,038.10
 */
function calcularISR(rentaGravable) {
  if (rentaGravable <= 550.00) return 0;
  if (rentaGravable <= 895.24) return 17.67 + (rentaGravable - 550.00) * 0.10;
  if (rentaGravable <= 2038.10) return 60.00 + (rentaGravable - 895.24) * 0.20;
  return 288.57 + (rentaGravable - 2038.10) * 0.30;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();

  // --- I. Datos de las partes ---
  const nombreTrabajador = document.getElementById('nombreTrabajador').value.trim();
  const patrono = document.getElementById('patrono').value.trim();
  const cargo = document.getElementById('cargo').value.trim();
  const fechaIngreso = fechaIngresoInput.value;
  const fechaTerminacion = fechaTerminacionInput.value;

  const salario = parseFloat(document.getElementById('salario').value);
  const causa = document.querySelector('input[name="causa"]:checked').value;

  // Si ambas fechas son válidas, la antigüedad (incluyendo días) se calcula de ellas
  // y tiene prioridad sobre los campos manuales de años/meses.
  const fechasValidas = fechaIngreso && fechaTerminacion;
  if (fechasValidas && !diffFechas(fechaIngreso, fechaTerminacion)) {
    return showError('La fecha de terminación debe ser posterior a la fecha de ingreso.');
  }
  const antiguedadPorFechas = diffFechas(fechaIngreso, fechaTerminacion);
  const anios = antiguedadPorFechas ? antiguedadPorFechas.anios : parseInt(aniosInput.value, 10);
  const meses = antiguedadPorFechas ? antiguedadPorFechas.meses : parseInt(mesesInput.value, 10);
  const diasExtra = antiguedadPorFechas ? antiguedadPorFechas.dias : 0;

  // --- II. Jornadas extraordinarias ---
  const heDiurnas = parseFloat(document.getElementById('heDiurnas').value) || 0;
  const heNocturnas = parseFloat(document.getElementById('heNocturnas').value) || 0;
  const diasAsueto = parseFloat(document.getElementById('diasAsueto').value) || 0;
  const diasDescanso = parseFloat(document.getElementById('diasDescanso').value) || 0;

  const salarioMinimo = sectorSelect.value === 'custom'
    ? parseFloat(salarioMinimoCustom.value)
    : parseFloat(sectorSelect.value);

  if (!salario || salario <= 0) return showError('Ingresa un salario mensual mayor a $0.');
  if (isNaN(anios) || anios < 0) return showError('Ingresa una cantidad válida de años laborados.');
  if (isNaN(meses) || meses < 0 || meses > 11) return showError('Los meses laborados deben estar entre 0 y 11.');
  if (!salarioMinimo || salarioMinimo <= 0) return showError('Selecciona el sector o ingresa un salario mínimo válido (se usa para el tope de ley).');

  // --- Salario básico diario y por hora ---
  const SBD = salario / 30;
  const H = SBD / 8;
  const fraccionAnio = (meses * 30 + diasExtra) / 360;
  const antiguedadTotal = anios + fraccionAnio;

  /* =========================================================
   * BLOQUE II — Desglose de prestaciones liquidadas
   * (fórmulas sin modificar respecto de la versión anterior)
   * ========================================================= */

  const vacacionAnual = SBD * 15 * 1.3;
  const vacacionProporcional = vacacionAnual * fraccionAnio;

  const diasAguinaldo = diasAguinaldoPorAntiguedad(anios);
  const aguinaldoAnual = SBD * diasAguinaldo;
  const aguinaldoProporcional = aguinaldoAnual * fraccionAnio;

  let montoCausa = 0;
  let notaCausa = '';
  let etiquetaCausa = '';
  let legalCausa = '';
  let exentoNota = '';

  if (causa === 'despido') {
    etiquetaCausa = 'Indemnización por despido injustificado';
    legalCausa = 'Art. 58 CT';
    exentoNota = 'indemnización y aguinaldo';
    const topeIndemnizacion = salarioMinimo * 4;
    const salarioBase = Math.min(salario, topeIndemnizacion);
    const base = salarioBase; // SBD_capado × 30 = salario base capado
    montoCausa = base * anios + base * fraccionAnio;
    const minimo = SBD * 15;
    if (montoCausa < minimo) montoCausa = minimo;
    if (salario > topeIndemnizacion) {
      notaCausa = `Se aplicó el tope legal de 4 salarios mínimos (${fmt.format(topeIndemnizacion)}) porque el salario ingresado lo supera (Art. 58 CT).`;
    }
  } else {
    etiquetaCausa = 'Prestación económica por renuncia voluntaria';
    legalCausa = 'Ley de Prestación por Renuncia Voluntaria (2014), Arts. 2 y 4';
    exentoNota = 'prestación por renuncia y aguinaldo';
    if (antiguedadTotal < 2) {
      montoCausa = 0;
      notaCausa = 'No aplica: la Ley Reguladora de la Prestación Económica por Renuncia Voluntaria exige un mínimo de 2 años de servicio continuo (Art. 2).';
    } else {
      const topeRenuncia = salarioMinimo * 2;
      const salarioBase = Math.min(salario, topeRenuncia);
      const base = salarioBase / 30 * 15; // SBD_capado × 15
      montoCausa = base * anios + base * fraccionAnio;
      if (salario > topeRenuncia) {
        notaCausa = `Se aplicó el tope legal de 2 salarios mínimos (${fmt.format(topeRenuncia)}) porque el salario ingresado lo supera (Ley de Renuncia Voluntaria, Art. 4).`;
      }
    }
  }

  const subtotalHeDiurnas = H * heDiurnas * 2;
  const subtotalHeNocturnas = H * heNocturnas * 2 * 1.25;
  const montoAsueto = SBD * 2 * diasAsueto;
  const montoDescanso = SBD * 1.5 * diasDescanso;

  const totalDevengado = vacacionProporcional + aguinaldoProporcional + montoCausa +
    subtotalHeDiurnas + subtotalHeNocturnas + montoAsueto + montoDescanso;

  /* =========================================================
   * BLOQUE III — Deducciones de ley y neto a pagar
   * (ISR corregido con tabla vigente desde mayo 2025)
   * ========================================================= */

  const montoExento = montoCausa + aguinaldoProporcional;
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
   * Pintar I. Datos de las partes
   * ========================================================= */
  document.getElementById('r-nombreTrabajador').textContent = nombreTrabajador || '— No especificada —';
  document.getElementById('r-patrono').textContent = patrono || '— No especificado —';
  document.getElementById('r-cargo').textContent = cargo || '— No especificado —';
  document.getElementById('r-salario').textContent = fmt.format(salario);
  document.getElementById('r-fechaIngreso').textContent = fechaIngreso ? fmtDate(fechaIngreso) : '— No especificada —';
  document.getElementById('r-fechaTerminacion').textContent = fechaTerminacion ? fmtDate(fechaTerminacion) : '— No especificada —';
  document.getElementById('r-antiguedad').textContent = diasExtra > 0
    ? `${anios} años, ${meses} meses, ${diasExtra} días`
    : `${anios} años, ${meses} meses`;
  document.getElementById('r-causaLabel2').textContent = causa === 'despido' ? 'Despido injustificado' : 'Renuncia voluntaria';

  /* =========================================================
   * Pintar II. Desglose de prestaciones liquidadas
   * ========================================================= */
  document.getElementById('r-vacacion').textContent = fmt.format(vacacionProporcional);
  document.getElementById('r-aguinaldo').textContent = fmt.format(aguinaldoProporcional);
  document.getElementById('r-causa-label').textContent = etiquetaCausa;
  document.getElementById('r-causa-legal').textContent = legalCausa;
  document.getElementById('r-causa').textContent = fmt.format(montoCausa);
  document.getElementById('r-heDiurnas').textContent = fmt.format(subtotalHeDiurnas);
  document.getElementById('r-heNocturnas').textContent = fmt.format(subtotalHeNocturnas);
  document.getElementById('r-asueto').textContent = fmt.format(montoAsueto);
  document.getElementById('r-descanso').textContent = fmt.format(montoDescanso);
  document.getElementById('r-total').textContent = fmt.format(totalDevengado);
  document.getElementById('r-nota').textContent = notaCausa;

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

  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('btn-print').addEventListener('click', () => window.print());

/**
 * Nota: las fórmulas de vacación, aguinaldo, indemnización/renuncia, horas
 * extras, asueto y descanso semanal (Bloque II) son idénticas a las de la
 * versión anterior de esta calculadora y fueron validadas contra el
 * Código de Trabajo de El Salvador vigente.
 *
 * CORRECCIÓN APLICADA (septiembre 2026): La tabla de retención de ISR
 * fue actualizada al Decreto Legislativo No. 293 del 30 de abril de 2025,
 * vigente desde mayo 2025. Los cambios principales son:
 *   - Límite exento: $550.00 (antes $472.00)
 *   - Cuota fija tramo II: $17.67 (antes $42.32)
 *   - Cuota fija tramo III: $60.00 (antes se calculaba incorrectamente)
 *   - Cuota fija tramo IV: $288.57 (antes $271.90)
 *
 * El Bloque III mantiene la separación entre renta gravada/exenta y
 * las deducciones de ISSS, AFP e ISR para obtener el monto neto a pagar,
 * ahora con la tabla de ISR correcta y vigente.
 */