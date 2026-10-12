import test from 'node:test';
import assert from 'node:assert/strict';
import { createReactMoodLookup, isReactMoodHit } from '../src/scene/react-mood.js';

const react = (offset, target, emotion) => ({ kind: 'react', offset, args: [target, emotion] });
const say = (offset, character) => ({ type: 'char', offset, character });

test('gate:react-mood: emotion holds until the character speaks again', () => {
    const reacts = [react(10, 'A', '生气')];
    const speech = [say(0, 'A'), say(30, 'A')];
    assert.equal(createReactMoodLookup({ reacts, speech, offset: 12 })('A'), '生气');
    assert.equal(createReactMoodLookup({ reacts, speech, offset: 25 })('A'), '生气', 'narration pages keep the reaction');
    assert.equal(createReactMoodLookup({ reacts, speech, offset: 30 })('A'), '', 'own line wins again');
    assert.equal(createReactMoodLookup({ reacts, speech, offset: 5 })('A'), '', 'not before the tag');
});

test('gate:react-mood: later react replaces earlier, 全员 applies to everyone, aliases resolve', () => {
    const keyOf = (n) => (n === '小爱' ? '爱丽丝' : n);
    const reacts = [react(10, '小爱', '生气'), react(20, '全员', '惊讶'), react(30, '爱丽丝', '开心')];
    const at = (offset) => createReactMoodLookup({ reacts, speech: [], offset, keyOf });
    assert.equal(at(15)('爱丽丝'), '生气');
    assert.equal(at(25)('爱丽丝'), '惊讶');
    assert.equal(at(25)('鲍勃'), '惊讶');
    assert.equal(at(35)('小爱'), '开心');
    assert.equal(at(35)('鲍勃'), '惊讶');
});

test('gate:react-mood: empty emotion or invalid offset changes nothing', () => {
    assert.equal(createReactMoodLookup({ reacts: [react(10, 'A', '')], offset: 20 })('A'), '');
    assert.equal(createReactMoodLookup({ reacts: [react(10, 'A', '生气')], offset: -1 })('A'), '');
    assert.equal(createReactMoodLookup({ reacts: [react(10, '', '生气')], offset: 20 })('A'), '');
});

test('gate:react-mood: only real expression hits switch the sprite', () => {
    assert.equal(isReactMoodHit({ url: 'a.png', slot: '愤怒', quality: 'exact' }), true);
    assert.equal(isReactMoodHit({ url: 'a.png', slot: '愤怒', quality: 'group' }), true);
    assert.equal(isReactMoodHit({ url: 'a.png', slot: '默认', quality: 'default' }), false);
    assert.equal(isReactMoodHit({ url: 'a.png', slot: '平和', quality: 'group' }), false);
    assert.equal(isReactMoodHit({ url: 'a.png', slot: '愤怒', quality: 'fuzzy' }), false);
    assert.equal(isReactMoodHit({ url: '', slot: '愤怒', quality: 'exact' }), false);
});
