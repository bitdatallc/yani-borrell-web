// Textos de Términos y condiciones. ES = texto original del sitio; EN = traducción.
export const TERMS = {
  es: {
    title: 'Términos y condiciones',
    intro: 'Bienvenido(a) a nuestro sitio web y servicios. Al acceder, navegar o contratar cualquiera de nuestros servicios, usted acepta cumplir con los presentes Términos y Condiciones. Le recomendamos leer cuidadosamente este documento antes de utilizar nuestros servicios.',
    sections: [
      ['Naturaleza de los servicios', 'Ofrecemos servicios de orientación, preparación documental, asesoría administrativa y acompañamiento informativo relacionados con procesos migratorios y trámites internacionales. No garantizamos resultados específicos ni aprobaciones por parte de autoridades gubernamentales.'],
      ['Responsabilidad del cliente', 'El cliente es responsable de proporcionar información veraz, completa y actualizada. La omisión o falsedad de información puede afectar negativamente cualquier trámite o solicitud.'],
      ['Pagos y honorarios', 'Todos los pagos realizados por servicios prestados son considerados honorarios administrativos y profesionales. Los pagos no son reembolsables una vez iniciado el trabajo, salvo disposición contraria establecida por escrito.'],
      ['No relación abogado-cliente', 'Nuestros servicios no constituyen representación legal ni sustituyen el asesoramiento de un abogado autorizado. En casos que requieran asistencia legal especializada, recomendamos consultar con un profesional licenciado.'],
      ['Tiempos de procesamiento', 'Los tiempos de procesamiento dependen exclusivamente de las autoridades gubernamentales correspondientes y pueden variar sin previo aviso. No somos responsables por retrasos externos.'],
      ['Protección de datos', 'Toda información personal compartida será manejada de manera confidencial y utilizada únicamente para fines relacionados con los servicios contratados, conforme a las leyes aplicables de privacidad y protección de datos.'],
      ['Propiedad intelectual', 'Todo el contenido del sitio web, incluyendo textos, imágenes, logotipos y materiales informativos, es propiedad exclusiva de la empresa y no puede ser reproducido sin autorización previa.'],
      ['Limitación de responsabilidad', 'No seremos responsables por daños directos o indirectos derivados del uso del sitio web, decisiones migratorias de terceros, negaciones gubernamentales o errores ocasionados por información incorrecta proporcionada por el cliente.'],
      ['Modificaciones', 'Nos reservamos el derecho de actualizar o modificar estos Términos y Condiciones en cualquier momento sin previo aviso. El uso continuo del sitio web implica la aceptación de dichos cambios.'],
      ['Contacto', 'Si tiene preguntas sobre estos Términos y Condiciones, puede comunicarse con nosotros a través de los canales oficiales publicados en nuestro sitio web.'],
    ],
    outro: 'Al utilizar este sitio web y nuestros servicios, usted confirma haber leído y aceptado estos Términos y Condiciones.',
    back: 'Volver al inicio',
    metaTitle: 'Términos y condiciones · Yani Borrell',
    metaDescription: 'Términos y condiciones de los servicios de orientación y asesoría migratoria de Yani Borrell (YB Consultancy).',
  },
  en: {
    title: 'Terms and conditions',
    intro: 'Welcome to our website and services. By accessing, browsing or hiring any of our services, you agree to comply with these Terms and Conditions. We recommend reading this document carefully before using our services.',
    sections: [
      ['Nature of the services', 'We offer guidance, document preparation, administrative advice and informational support related to immigration processes and international procedures. We do not guarantee specific results or approvals by government authorities.'],
      ['Client responsibility', 'The client is responsible for providing truthful, complete and up-to-date information. Omitted or false information may negatively affect any procedure or application.'],
      ['Payments and fees', 'All payments for services rendered are considered administrative and professional fees. Payments are non-refundable once work has begun, unless otherwise agreed in writing.'],
      ['No attorney-client relationship', 'Our services do not constitute legal representation and do not replace the advice of a licensed attorney. In cases requiring specialized legal assistance, we recommend consulting a licensed professional.'],
      ['Processing times', 'Processing times depend exclusively on the relevant government authorities and may vary without notice. We are not responsible for external delays.'],
      ['Data protection', 'All personal information shared will be handled confidentially and used solely for purposes related to the contracted services, in accordance with applicable privacy and data protection laws.'],
      ['Intellectual property', 'All website content, including text, images, logos and informational materials, is the exclusive property of the company and may not be reproduced without prior authorization.'],
      ['Limitation of liability', 'We shall not be liable for direct or indirect damages arising from the use of the website, third-party immigration decisions, government denials or errors caused by incorrect information provided by the client.'],
      ['Changes', 'We reserve the right to update or modify these Terms and Conditions at any time without notice. Continued use of the website implies acceptance of such changes.'],
      ['Contact', 'If you have questions about these Terms and Conditions, you can reach us through the official channels published on our website.'],
    ],
    outro: 'By using this website and our services, you confirm that you have read and accepted these Terms and Conditions.',
    back: 'Back to home',
    metaTitle: 'Terms and conditions · Yani Borrell',
    metaDescription: 'Terms and conditions for the immigration guidance and advisory services of Yani Borrell (YB Consultancy).',
  },
};

// Lista numerada de secciones [título, texto]; la comparten Términos y Política de privacidad
export function legalListMarkup(sections) {
  return sections
    .map(([h, p], i) => `<li><h2><span>${String(i + 1).padStart(2, '0')}</span>${h}</h2><p>${p}</p></li>`)
    .join('');
}

export function termsListMarkup(lang) {
  return legalListMarkup(TERMS[lang].sections);
}
