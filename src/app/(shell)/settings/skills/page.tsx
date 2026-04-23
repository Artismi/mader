import { SkillsEditor } from "@/components/ui/skills-editor";
import { DEFAULT_ARCHITECTURE } from "@/lib/ai/defaults";
import { skills as skillsDb, config } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SkillsPage() {
    const skillsData = skillsDb.getAll();
    const archValue = config.get('architecture');

    const skills = skillsData.length > 0 ? skillsData : [];
    const architecture = archValue ?? DEFAULT_ARCHITECTURE;

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
