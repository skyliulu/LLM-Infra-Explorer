// FP32 -> BF16 round-to-nearest, ties-to-even. Covers signed zero,
// subnormals, finite values, infinity and canonical quiet NaN.
const buffer=new ArrayBuffer(4), view=new DataView(buffer);
export function bf16Bits(value) {
  view.setFloat32(0,value,false);
  const raw=view.getUint32(0,false);
  if((raw&0x7fffffff)>0x7f800000) return (raw>>>16)|0x40;
  return ((raw+0x7fff+((raw>>>16)&1))>>>16)&0xffff;
}
export function fromBF16(bits){view.setUint32(0,(bits&0xffff)<<16,false);return view.getFloat32(0,false);}
export const toBF16=value=>fromBF16(bf16Bits(value));
export function describeBF16(value){
 const raw=bf16Bits(value),sign=raw>>>15,exponent=(raw>>>7)&255,fraction=raw&127;
 const fields=[String(sign),exponent.toString(2).padStart(8,'0'),fraction.toString(2).padStart(7,'0')];
 return {input:value,sign,exponent,fraction,power:exponent-127,fields,bits:fields.join(''),represented:fromBF16(raw),bias:127,fractionBits:7,exponentBits:8,format:'BF16'};
}
