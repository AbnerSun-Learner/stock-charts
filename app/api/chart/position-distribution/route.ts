import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabase
        .from('chart_position_distribution')
        .select('name, date, payload')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Supabase error:', error.message);
        return NextResponse.json(
          { error: 'Failed to load chart data' },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json(
          { error: 'No chart data found' },
          { status: 404 }
        );
      }

      const payload = (data.payload as Record<string, unknown>) ?? {};
      return NextResponse.json({
        name: data.name,
        date: data.date,
        ...payload,
      });
    } catch (e) {
      console.error('API error:', e);
      return NextResponse.json(
        { error: 'Failed to load chart data' },
        { status: 500 }
      );
    }
  }

  try {
    const path = join(process.cwd(), 'data', 'position_distribution.json');
    const raw = await readFile(path, 'utf-8');
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch (e) {
    console.error('Fallback read error:', e);
    return NextResponse.json(
      { error: 'Chart data not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or add data/position_distribution.json.' },
      { status: 503 }
    );
  }
}
