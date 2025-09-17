import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tenderId = searchParams.get('tenderId');

    if (!tenderId) {
      return NextResponse.json({ error: 'Tender ID is required' }, { status: 400 });
    }

    // Fetch existing proposal for this tender
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', user.id)
      .eq('tender_id', tenderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if no proposal exists
      console.error('Error fetching proposal:', error);
      return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
    }

    return NextResponse.json({
      proposal: proposal || null,
      exists: !!proposal
    });

  } catch (error) {
    console.error('Error in proposals get route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}