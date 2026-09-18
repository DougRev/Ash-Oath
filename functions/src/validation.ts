import { acceptableName } from '../../src/game/names';
import { DUNGEONS } from '../../src/game/data';
import { z } from 'zod';

const role = z.enum(['offense', 'defense']);
const tactic = z.enum(['balanced', 'aggressive', 'guarded']);
const count = z.number().int().min(1).max(1000);
const itemId = z.string().regex(/^r\d{1,12}$/);
export const actionSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('readDefenseReports'),
      through: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    })
    .strict(),
  z.object({ type: z.literal('upgradeBarracks') }).strict(),
  z.object({ type: z.literal('upgradeBank') }).strict(),
  z.object({ type: z.literal('upgradeOffense') }).strict(),
  z.object({ type: z.literal('upgradeDefense') }).strict(),
  z
    .object({ type: z.literal('raidRival'), rival: z.string().regex(/^ai-[0-5]-[0-2]$/), tactic })
    .strict(),
  z
    .object({
      type: z.literal('bank'),
      direction: z.enum(['deposit', 'withdraw']),
      amount: z.number().int().min(1).max(1_000_000_000),
    })
    .strict(),
  z
    .object({ type: z.literal('faction'), id: z.enum(['iron', 'verdant', 'ashen', 'tide']) })
    .strict(),
  z.object({ type: z.literal('upgrade') }).strict(),
  z
    .object({
      type: z.literal('build'),
      building: z.enum(['armory', 'blacksmith', 'trader', 'watchtower', 'bank']),
    })
    .strict(),
  z.object({ type: z.literal('recruit'), role, count }).strict(),
  z.object({ type: z.literal('assign'), from: role, count }).strict(),
  z.object({ type: z.literal('arm'), role, count }).strict(),
  z
    .object({
      type: z.literal('weapon'),
      role,
      weapon: z.enum(['militia', 'spear', 'longbow', 'halberd']),
    })
    .strict(),
  z
    .object({
      type: z.literal('buyKit'),
      equip: z.boolean().optional(),
      role,
      kit: z.enum(['militia', 'spear', 'longbow', 'halberd', 'armor']),
      count,
    })
    .strict(),
  z
    .object({
      type: z.literal('equipKit'),
      role,
      kit: z.enum(['militia', 'spear', 'longbow', 'halberd', 'armor']),
      count: z.number().int().min(0).max(1000),
    })
    .strict(),
  z.object({ type: z.literal('healPet'), id: itemId }).strict(),
  z
    .object({
      type: z.literal('fight'),
      mode: z.enum(['army', 'personal']),
      dungeon: z.number().int().min(0).max(DUNGEONS.length - 1),
      stage: z.number().int().min(1).max(5),
      tactic,
      troops: count.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('attack'),
      opponent: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
      tactic,
    })
    .strict(),
  z.object({ type: z.literal('extract') }).strict(),
  z.object({ type: z.literal('equip'), id: itemId }).strict(),
  z.object({ type: z.literal('unequip'), id: itemId }).strict(),
  z.object({ type: z.literal('sell'), id: itemId }).strict(),
  z.object({ type: z.literal('chest'), tier: z.number().int().min(0).max(2) }).strict(),
  z
    .object({
      type: z.literal('donate'),
      amount: z.number().int().min(100).max(2000).multipleOf(100),
    })
    .strict(),
  z.object({ type: z.literal('enlist'), enabled: z.boolean() }).strict(),
  z
    .object({
      type: z.literal('rename'),
      name: z
        .string()
        .trim()
        .min(3)
        .max(24)
        .regex(/^[\p{L}\p{N} '’-]+$/u)
        .refine(acceptableName, 'Choose a name without profanity or abusive language.'),
    })
    .strict(),
]);
export const commandSchema = z
  .object({
    requestId: z.string().uuid(),
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    action: actionSchema,
  })
  .strict();
export const realmRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[\p{L}\p{N} '’-]+$/u)
      .refine(acceptableName, 'Choose a name without profanity or abusive language.')
      .optional(),
  })
  .strict();
