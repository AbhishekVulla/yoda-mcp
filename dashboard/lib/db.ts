import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type BookedActivity = {
  event?: string;
  location?: string;
  date?: string;
  time?: string;
  reference?: string;
};

export type SeniorProfile = {
  senior_id?: string;
  last_updated?: string;
  section_a_identification?: {
    preferred_name?: string;
    name?: string;
    age?: number;
    location?: string;
    living_arrangement?: string;
  };
  section_p_caregiver?: {
    primary_caregiver?: { relationship?: string; name?: string; availability?: string };
  };
  yoda_profile?: {
    preferred_address?: string;
    language_preference?: string;
    interests?: string[];
    enrolled_services?: string[];
    fitness_preferences?: {
      preferred_day?: string;
      preferred_location?: string;
      goals?: string[];
    };
    risk_flags?: string[];
    booked_activities?: BookedActivity[];
    caregiver_alerts?: string[];
  };
};

/** Read one senior's full knowledge-base profile from the shared Neon DB. */
export async function getProfile(seniorId = "mdm-tan"): Promise<SeniorProfile | null> {
  const rows = (await sql`
    SELECT data FROM profiles WHERE senior_id = ${seniorId}
  `) as { data: SeniorProfile }[];
  return rows[0]?.data ?? null;
}

export type ActivityRequest = {
  id: number;
  event: { name?: string; location?: string; date?: string; time?: string };
  status: "pending" | "approved" | "declined";
  reference?: string | null;
  created_at?: string;
};

/** Activity requests Yoda raised for the caregiver to decide on. */
export async function listRequests(seniorId = "mdm-tan"): Promise<ActivityRequest[]> {
  const rows = (await sql`
    SELECT id, event, status, reference, created_at
    FROM requests WHERE senior_id = ${seniorId}
    ORDER BY created_at DESC
  `) as ActivityRequest[];
  return rows;
}

/** Caregiver decision. On approve: mint a mock booking ref AND append the confirmed
 *  activity to the senior's profile (so it shows under "Arranged by Yoda"). */
export async function decideRequest(id: number, decision: "approve" | "decline"): Promise<void> {
  const status = decision === "approve" ? "approved" : "declined";
  const reference = decision === "approve" ? `ACT-${Math.floor(1000 + Math.random() * 9000)}` : null;

  const rows = (await sql`
    UPDATE requests
    SET status = ${status}, reference = ${reference}, decided_at = now(), decided_by = 'caregiver'
    WHERE id = ${id}
    RETURNING senior_id, event
  `) as { senior_id: string; event: ActivityRequest["event"] }[];

  const r = rows[0];
  if (decision === "approve" && r) {
    const booking = JSON.stringify({
      event: r.event.name,
      location: r.event.location,
      date: r.event.date,
      time: r.event.time,
      reference,
    });
    await sql`
      UPDATE profiles
      SET data = jsonb_set(
        data, '{yoda_profile,booked_activities}',
        COALESCE(data->'yoda_profile'->'booked_activities', '[]'::jsonb) || ${booking}::jsonb,
        true
      )
      WHERE senior_id = ${r.senior_id}
    `;
  }
}
