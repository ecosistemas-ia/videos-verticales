// Los archivos que el bundler de Remotion trata como recursos: el import da la dirección del archivo en el paquete.
declare module '*.woff2' {
  const direccion: string;
  export default direccion;
}
