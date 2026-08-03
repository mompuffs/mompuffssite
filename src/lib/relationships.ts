import { db } from "@/lib/db";

// True if either user has blocked the other -- used to gate friend
// requests and messages in both directions.
export async function isBlockedEitherWay(userAId: string, userBId: string): Promise<boolean> {
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    },
    select: { id: true },
  });
  return !!block;
}
