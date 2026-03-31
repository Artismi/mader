import { createClient } from "@/lib/supabase/server";
import { SkillsEditor } from "@/components/ui/skills-editor";
import { DEFAULT_SKILLS, DEFAULT_ARCHITECTURE } from "@/lib/ai/defaults";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SkillsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let skills = DEFAULT_SKILLS;
    let architecture = DEFAULT_ARCHITECTURE;

    if (user) {
        const [{ data: skillsData }, { data: archData }] = await Promise.all([
            supabase.from('skills').select('*').eq('user_id', user.id).order('sort_order'),
            supabase.from('system_config').select('value').eq('user_id', user.id).eq('key', 'architecture').maybeSingle(),
        ]);

        if (skillsData && skillsData.length > 0) skills = skillsData;
        if (archData?.value) architecture = archData.value;
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3">
                <Link href="/settings" className="text-primary/40 hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Skill & Architettura AI</h1>
                    <p className="mt-1 text-sm text-primary/70">Personalizza come il Co-Pilot risponde e si comporta.</p>
                </div>
            </div>

            <SkillsEditor initialSkills={skills} initialArchitecture={architecture} />
        </div>
    );
}
