import type { CourseModule } from '../db';
import { nineBlocks, tip, warn, info } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Number Systems & Codes',
  summary:
    'Binary, octal, hex and the conversions every digital exam expects — plus BCD, Gray and ASCII.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'de-m1-l1',
      1,
      'Binary, Octal and Hexadecimal',
      'Positional bases, weight expansion and fast base-16/base-8 conversions.',
      10,
      nineBlocks({
        objectives: [
          'Expand a binary number using positional weights',
          'Convert between binary, octal and hexadecimal in both directions',
          'Convert decimal to binary by repeated division',
        ],
        hook: 'Every processor stores numbers as bits. Hex is just a compact way humans read four bits at a time — 0x3F is the byte 00111111.',
        concept: `**Positional notation:** a digit's value is digit x base^position, counting positions from 0 at the right. The decimal 345 = 3x100 + 4x10 + 5x1.

**Binary (base 2):** only 0 and 1. 1011_2 = 1x8 + 0x4 + 1x2 + 1x1 = 11_10.

**Octal (base 8) and Hex (base 16):** one octal digit = three binary bits; one hex digit = four bits. Convert by regrouping bits from the LSB, padding with leading zeros — never by going through decimal twice.

**Decimal to any base:** repeated division by the base; read remainders bottom-to-top (LSB first).`,
        extras: [
          tip(
            'Hex grouping is four bits, not three',
            'Octal groups of 3 and hex groups of 4 both start from the binary LSB. Pad the leftmost group with zeros.',
          ),
          warn(
            'Leading-zero padding mistakes',
            'When converting 11011 to octal you must pad: 010 111 — not 11 011.',
          ),
        ],
        worked: {
          title: 'Convert 255 decimal to binary and hex',
          problem: 'Express 255_10 in binary and in hexadecimal.',
          steps: [
            {
              title: 'Divide by 2 repeatedly',
              desc: '255/2=127 r1, 127/2=63 r1, 63/2=31 r1, 31/2=15 r1, 15/2=7 r1, 7/2=3 r1, 3/2=1 r1, 1/2=0 r1.',
            },
            {
              title: 'Read remainders LSB-first',
              desc: '11111111.',
            },
            {
              title: 'Group into nibbles for hex',
              desc: '1111 1111 = FF in hex.',
            },
          ],
          solution: '255_10 = 11111111_2 = FF_16',
        },
        practice: {
          title: 'Convert 174 decimal',
          prompt: 'Find 174_10 in binary and hexadecimal.',
          hint: 'Divide by 2 seven times; the result fits in one byte.',
        },
        mistakes: [
          {
            mistake: 'Reading remainders top-to-bottom',
            fix: 'The first remainder is the least significant bit. Reading MSB-first gives a bit-reversed number.',
          },
          {
            mistake: 'Skipping the leading-zero pad',
            fix: '1001 converted as octal without padding becomes 11 instead of 012.',
          },
        ],
        exam: {
          question: 'Convert A3_16 to decimal.',
          answer: 'A3 = 10x16 + 3 = 163.',
          source: 'Common university mid-term conversion question.',
        },
        summary: [
          'Positional weight expansion is the foundation of every base conversion.',
          'Binary-to-octal = 3-bit groups; binary-to-hex = 4-bit groups from the LSB.',
          'Decimal-to-base: repeated division; remainders are LSB-first.',
        ],
      }),
      [
        [
          '1011_2 equals which decimal?',
          ['9', '10', '11', '12'],
          2,
          '8+0+2+1 = 11.',
        ],
        [
          'Hex 1C equals which decimal?',
          ['26', '28', '30', '112'],
          1,
          '1x16 + 12 = 28.',
        ],
        [
          'Binary 01011100 in octal is:',
          ['54', '134', '270', '114'],
          1,
          'Pad to 001 011 100 = 1 3 4 = 134 octal (equals 92 decimal).',
        ],
      ]
    ),
    lesson(
      M1,
      'de-m1-l2',
      2,
      'BCD, Gray and Character Codes',
      'How decimal digits, error-resistant counters and text are encoded as bits.',
      9,
      nineBlocks({
        objectives: [
          'Encode a decimal number in BCD and decode it back',
          'Explain why Gray code changes only one bit between consecutive values',
          'State the ASCII code for a character and compute a simple parity bit',
        ],
        hook: 'Cash registers, seven-segment displays and instrument panels do not store "42" as binary 101010 — they store BCD 0100 0010 so each digit lights its own seven-segment group.',
        concept: `**BCD (Binary Coded Decimal):** each decimal digit gets its own 4-bit nibble. 42 -> 0100 0010. Sixteen of the 32 nibble patterns are unused — arithmetic on BCD needs correction after sums that exceed 9.

**Gray code:** a reflected binary code where successive values differ by exactly one bit. That property prevents multi-bit glitches in mechanical encoders (e.g. a rotary shaft encoder) during transitions.

**ASCII / text codes:** ASCII maps characters to 7 bits (extended 8-bit variants exist). Unicode/UTF-8 is the modern superset — but exam questions still test ASCII positions: 'A' = 65, 'a' = 97, '0' = 48.

**Parity:** a single extra bit that makes the total number of 1s even (even parity) or odd (odd parity) — the cheapest error detector.`,
        extras: [
          tip(
            'BCD vs plain binary',
            'BCD wastes range but keeps each decimal digit independently addressable — ideal for display hardware.',
          ),
          info(
            'Gray code construction',
            'Reflect the existing list and prefix 0 on the first half, 1 on the reflected half. Start: 00, 01 -> reflect -> 11, 10.',
          ),
        ],
        worked: {
          title: 'BCD for 389 and Gray for 5',
          problem: 'Encode 389 in BCD. Convert binary 0101 to Gray.',
          steps: [
            {
              title: 'Split into decimal digits',
              desc: '389 into digits: 3, 8, 9.',
            },
            {
              title: 'Encode each digit as 4 bits',
              desc: '3=0011, 8=1000, 9=1001.',
            },
            {
              title: 'Concatenate for BCD',
              desc: '0011 1000 1001.',
            },
            {
              title: 'Binary 0101 to Gray',
              desc: 'g3=b3=0, g2=b3^b2=0^1=1, g1=b2^b1=1^0=1, g0=b1^b0=0^1=1.',
            },
          ],
          solution: 'BCD(389) = 0011 1000 1001. Gray(0101) = 0111.',
        },
        practice: {
          title: 'Encode 57 in BCD',
          prompt: 'Write the BCD encoding of 57 and state how many bits it occupies.',
          hint: 'Two decimal digits, two nibbles.',
        },
        mistakes: [
          {
            mistake: 'Treating BCD as plain binary',
            fix: 'BCD(23) is 0010 0011, not the binary 0001 0111.',
          },
          {
            mistake: 'XOR direction in Gray conversion',
            fix: 'Gray bit i = binary bit i XOR binary bit i+1 (higher bit). Reversing the pairing flips the code.',
          },
        ],
        exam: {
          question: 'State two advantages of Gray code over binary in a rotary encoder.',
          answer: 'Single-bit transitions prevent intermediate glitch values; only one sensor channel changes state per step.',
          source: 'Typical ECE digital lab viva.',
        },
        summary: [
          'BCD encodes each decimal digit in its own nibble for display hardware.',
          'Gray code changes one bit per step — critical for mechanical encoders.',
          'ASCII: A=65, a=97, 0=48; parity detects single-bit errors.',
        ],
      }),
      [
        [
          'BCD encoding of 47 is:',
          ['0100 0111', '0010 1111', '0111 0100', '0100 0111'],
          0,
          '4=0100, 7=0111.',
        ],
        [
          'Gray code of binary 1011 is:',
          ['1110', '1111', '1001', '1101'],
          0,
          'g3=1, g2=1^0=1, g1=0^1=1, g0=1^1=0 => 1110.',
        ],
        [
          'ASCII code for character A:',
          ['97', '65', '48', '66'],
          1,
          'Uppercase A starts the alphabet block at 65.',
        ],
      ]
    ),
  ],
};
