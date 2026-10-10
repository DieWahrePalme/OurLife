import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { strings } from '@/constants/strings';
import type { PaletteColors } from '@/constants/theme';
import { getSpaceId } from '@/features/sync/context';

import { ensureSession, fetchMembers, renameMemberOnServer, type Member } from './space-api';
import { useSpaceStore } from './space-store';

interface SpaceSectionProps {
  colors: PaletteColors;
}

/** Settings block: space name, pairing code, and the people in the space (everyone is an admin). */
export function SpaceSection({ colors }: SpaceSectionProps) {
  const { spaceName, pairCode, renameSpace, newPairCode, removeMember, leaveSpace } = useSpaceStore();
  const [nameDraft, setNameDraft] = useState(spaceName);
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [myNameDraft, setMyNameDraft] = useState('');
  const [armed, setArmed] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    const spaceId = getSpaceId();
    if (!spaceId) return;
    try {
      const [list, id] = await Promise.all([fetchMembers(spaceId), ensureSession()]);
      setMembers(list);
      setMyId(id);
      setMyNameDraft((current) => current || list.find((m) => m.userId === id)?.nickname || '');
    } catch {
      setMessage(strings.settingsMembersFailed);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const attempt = async (action: () => Promise<void>, done?: string) => {
    setMessage(null);
    try {
      await action();
      if (done) setMessage(done);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  const remove = (member: Member) => {
    if (armed !== member.userId) return setArmed(member.userId);
    setArmed(null);
    attempt(async () => {
      await removeMember(member.userId);
      await loadMembers();
    });
  };

  const field = [styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.page }];

  return (
    <>
      <Text accessibilityRole="header" style={[styles.title, styles.spaced, { color: colors.ink }]}>{strings.settingsSpaceNameTitle}</Text>
      <TextInput style={field} value={nameDraft} onChangeText={setNameDraft} maxLength={60} accessibilityLabel={strings.settingsSpaceNameTitle} />
      <PillButton colors={colors} label={strings.settingsSpaceNameSave} disabled={!nameDraft.trim()} onPress={() => attempt(() => renameSpace(nameDraft), 'Saved.')} />

      <Text accessibilityRole="header" style={[styles.title, styles.spaced, { color: colors.ink }]}>{strings.settingsCodeTitle}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.settingsCodeHint}</Text>
      <Text selectable style={[field, styles.code]}>{pairCode}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.settingsCodeNewHint}</Text>
      <PillButton
        colors={colors}
        label={armed === 'code' ? strings.settingsMemberRemoveConfirm : strings.settingsCodeNew}
        onPress={() => {
          if (armed !== 'code') return setArmed('code');
          setArmed(null);
          attempt(newPairCode, 'New code is ready.');
        }}
      />

      <Text accessibilityRole="header" style={[styles.title, styles.spaced, { color: colors.ink }]}>{strings.settingsMembersTitle}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.settingsMembersHint}</Text>
      {members.map((member) => {
        const isMe = member.userId === myId;
        const name = member.nickname || strings.settingsMemberUnnamed;
        return (
          <View key={member.userId} style={[styles.memberRow, { borderColor: colors.line, backgroundColor: colors.page }]}>
            <Text style={{ color: colors.ink, fontSize: 16, flex: 1 }}>
              {name}
              {isMe ? ` (${strings.settingsMemberYou})` : ''}
            </Text>
            {isMe ? null : (
              <PillButton
                colors={colors}
                label={armed === member.userId ? strings.settingsMemberRemoveConfirm : strings.settingsMemberRemove}
                accessibilityLabel={strings.settingsMemberRemoveLabel(name)}
                onPress={() => remove(member)}
              />
            )}
          </View>
        );
      })}
      <Text style={[styles.hint, { color: colors.ink, marginTop: 8 }]}>{strings.settingsMemberRename}</Text>
      <TextInput
        style={field}
        value={myNameDraft}
        onChangeText={setMyNameDraft}
        maxLength={40}
        accessibilityLabel={strings.settingsMemberRename}
      />
      <PillButton
        colors={colors}
        label={strings.settingsMemberRenameSave}
        disabled={myId === null}
        onPress={() => myId && attempt(async () => {
          await renameMemberOnServer(myId, myNameDraft.trim());
          await loadMembers();
        }, 'Saved.')}
      />

      <Text accessibilityRole="header" style={[styles.title, styles.spaced, { color: colors.ink }]}>{strings.settingsLeaveTitle}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>
        {members.length === 1 ? strings.settingsLeaveHintLast : strings.settingsLeaveHint}
      </Text>
      <PillButton
        colors={colors}
        label={armed === 'leave' ? strings.settingsMemberRemoveConfirm : strings.settingsLeave}
        disabled={myId === null || members.length === 0}
        onPress={() => {
          if (armed !== 'leave') return setArmed('leave');
          setArmed(null);
          // Only a loaded list with exactly this phone in it counts as "the last person".
          attempt(() => leaveSpace(members.length === 1));
        }}
      />

      {message ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.today, fontSize: 14 }}>{message}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 42 },
  spaced: { marginTop: 24 },
  hint: { fontSize: 14 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  code: { paddingVertical: 12, lineHeight: 24 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 8, paddingLeft: 14 },
});
