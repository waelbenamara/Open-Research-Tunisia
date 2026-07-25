"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateProfileAction } from "@/actions/auth";
import { Avatar, Button, Field, FormError, FormSuccess } from "@/components/ui";

type Values = {
  name: string;
  headline: string;
  affiliation: string;
  city: string;
  bio: string;
  skills: string;
  languages: string;
  orcid: string;
  website: string;
  scholar: string;
  github: string;
};

export function ProfileEditForm({
  user,
  avatar,
}: {
  user: Values;
  avatar: { src: string | null; color: string; hasUpload: boolean };
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  // Local preview of a freshly chosen picture, before saving.
  const [preview, setPreview] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError>{state?.error}</FormError>
      <FormSuccess>{state?.success}</FormSuccess>

      <div className="flex items-center gap-5">
        <Avatar
          name={user.name}
          color={avatar.color}
          src={removing ? null : preview ?? avatar.src}
          size={64}
        />
        <div className="flex flex-col gap-1.5">
          <Field label="Profile picture" hint="PNG, JPG, WebP or GIF — up to 4 MB">
            <input
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
                if (f) setRemoving(false);
              }}
            />
          </Field>
          {(avatar.hasUpload || avatar.src) && !preview ? (
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-4">
              <input
                type="checkbox"
                name="removeAvatar"
                className="!w-auto"
                checked={removing}
                onChange={(e) => setRemoving(e.target.checked)}
              />
              Remove current picture
            </label>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input name="name" defaultValue={user.name} required />
        </Field>
        <Field label="Headline" hint="one line">
          <input
            name="headline"
            defaultValue={user.headline}
            placeholder="Statistics undergraduate"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Affiliation">
          <input
            name="affiliation"
            defaultValue={user.affiliation}
            placeholder="University or organization"
          />
        </Field>
        <Field label="City">
          <input name="city" defaultValue={user.city} placeholder="Tunis" />
        </Field>
      </div>

      <Field label="Bio" hint="what you're interested in, what you want to learn">
        <textarea name="bio" rows={4} defaultValue={user.bio} />
      </Field>

      <Field label="Skills" hint="comma separated — this is what leads search by">
        <input
          name="skills"
          defaultValue={user.skills}
          placeholder="Python, statistics, data cleaning, literature search"
        />
      </Field>

      <Field label="Languages" hint="comma separated">
        <input name="languages" defaultValue={user.languages} placeholder="Arabic, French, English" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ORCID" hint="optional">
          <input name="orcid" defaultValue={user.orcid} placeholder="0000-0000-0000-0000" />
        </Field>
        <Field label="Website" hint="optional">
          <input name="website" defaultValue={user.website} placeholder="https://…" />
        </Field>
        <Field label="Google Scholar" hint="optional">
          <input name="scholar" defaultValue={user.scholar} placeholder="https://scholar.google.com/…" />
        </Field>
        <Field label="GitHub" hint="optional">
          <input name="github" defaultValue={user.github} placeholder="https://github.com/…" />
        </Field>
      </div>

      <div className="mt-2 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
