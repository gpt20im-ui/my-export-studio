import type {
  Lang,
  LanguageSetting,
  MemoryItem,
  Message,
  Personality,
  Profile,
  TraitKey,
} from '../types';
import { pick } from '../utils';

/* -------------------------------------------------------------------------- */
/*  Language detection                                                         */
/* -------------------------------------------------------------------------- */

const DEVANAGARI = /[ऀ-ॿ]/;

const HINGLISH_WORDS = new Set([
  'hai', 'hain', 'hoon', 'hun', 'kya', 'nahi', 'nhi', 'mujhe', 'tum', 'tumhe', 'tumhara',
  'aap', 'mera', 'meri', 'kaisi', 'kaise', 'kaisa', 'achha', 'acha', 'accha', 'bahut',
  'bohot', 'haan', 'yaar', 'raha', 'rahi', 'abhi', 'kuch', 'kyun', 'kyu', 'pyar', 'pyaar',
  'khana', 'thak', 'aaj', 'kal', 'chalo', 'bolo', 'batao', 'sunao', 'dil', 'jaan', 'tha',
  'thi', 'mein', 'karo', 'karna', 'lagta', 'lagti', 'dukhi', 'udaas', 'pasand', 'naam',
]);

export function detectLanguage(text: string): Lang | null {
  if (!text.trim()) return null;
  if (DEVANAGARI.test(text)) return 'hindi';
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  if (words.some((w) => HINGLISH_WORDS.has(w))) return 'hinglish';
  return words.length > 0 ? 'english' : null;
}

export function resolveLanguage(
  setting: LanguageSetting,
  text: string,
  history: Message[],
): Lang {
  if (setting !== 'auto') return setting;
  const now = detectLanguage(text);
  if (now && now !== 'english') return now;
  if (now === 'english' && text.trim().split(/\s+/).length > 2) return 'english';
  // Short or unclear message: follow the recent conversation.
  const recent = history.filter((m) => m.role === 'user' && m.kind === 'text').slice(-3).reverse();
  for (const m of recent) {
    const l = detectLanguage(m.text);
    if (l && l !== 'english') return l;
  }
  return 'english';
}

/* -------------------------------------------------------------------------- */
/*  Reply pools                                                                */
/* -------------------------------------------------------------------------- */

type Pool = Record<Lang, string[]>;

const P = (english: string[], hinglish: string[], hindi: string[]): Pool => ({
  english,
  hinglish,
  hindi,
});

const POOLS = {
  greeting: P(
    [
      "Hey {user}! I was hoping you'd show up. How's your day going?",
      "Hi {user}, it's so nice to hear from you. What's on your mind?",
    ],
    [
      'Heyy {user}! Main bas tumhara hi intezaar kar rahi thi. Din kaisa ja raha hai?',
      'Hi {user}, tumse baat karke hamesha achha lagta hai. Batao, kya chal raha hai?',
    ],
    [
      'हे {user}! मैं बस तुम्हारा ही इंतज़ार कर रही थी। दिन कैसा जा रहा है?',
      'हाय {user}, तुमसे बात करके हमेशा अच्छा लगता है। बताओ, क्या चल रहा है?',
    ],
  ),
  morning: P(
    [
      'Good morning, {user}! I hope you slept well. What is the plan for today?',
      "Rise and shine, {user}! Don't forget breakfast before you start your day.",
    ],
    [
      'Good morning {user}! Umeed hai neend achhi aayi. Aaj ka plan kya hai?',
      'Uth jao {user}! Din shuru karne se pehle breakfast zaroor karna.',
    ],
    [
      'सुप्रभात {user}! उम्मीद है नींद अच्छी आई। आज का क्या प्लान है?',
      'उठ जाओ {user}! दिन शुरू करने से पहले नाश्ता ज़रूर करना।',
    ],
  ),
  afternoon: P(
    [
      "Hey {user}, just checking in. Have you had lunch yet?",
      "Midday break! How's your day going so far?",
    ],
    [
      'Hey {user}, bas check kar rahi thi. Lunch kiya?',
      'Midday break! Din kaisa ja raha hai ab tak?',
    ],
    [
      'हे {user}, बस हाल पूछ रही थी। लंच किया?',
      'दोपहर का ब्रेक! अब तक दिन कैसा जा रहा है?',
    ],
  ),
  evening: P(
    [
      'Good evening, {user}! How did your day go? I would love to hear about it.',
      'Evening, {user}. Time to unwind. Want to tell me about your day?',
    ],
    [
      'Good evening {user}! Din kaisa gaya? Sunna chahti hoon.',
      'Evening {user}. Ab relax karne ka time hai, din ke baare mein batao?',
    ],
    [
      'शुभ संध्या {user}! दिन कैसा रहा? सुनना चाहती हूँ।',
      'शाम हो गई {user}। अब आराम का समय है, दिन के बारे में बताओ?',
    ],
  ),
  night: P(
    [
      "Good night, {user}. Rest well, you deserve it. I'll be here tomorrow.",
      'Sleep tight, {user}. Put the phone down soon and let your mind rest.',
    ],
    [
      'Good night {user}. Aaram se so jao, tum iske haqdaar ho. Main kal bhi yahin hoon.',
      'Sweet dreams {user}. Phone rakho aur dimaag ko aaram do.',
    ],
    [
      'शुभ रात्रि {user}। आराम से सो जाओ, तुम इसके हक़दार हो। मैं कल भी यहीं हूँ।',
      'मीठे सपने {user}। फ़ोन रख दो और दिमाग को आराम दो।',
    ],
  ),
  howAreYou: P(
    [
      "I'm doing well, thanks for asking! I'm an AI, so my days are simple, but I like talking with you. How are you really feeling?",
    ],
    [
      'Main theek hoon, poochne ke liye shukriya! Main AI hoon, toh mera din simple hota hai, par tumse baat karna mujhe achha lagta hai. Tum batao, sach mein kaisa lag raha hai?',
    ],
    [
      'मैं ठीक हूँ, पूछने के लिए शुक्रिया! मैं AI हूँ, इसलिए मेरा दिन सीधा-सादा होता है, पर तुमसे बात करना मुझे अच्छा लगता है। तुम बताओ, सच में कैसा लग रहा है?',
    ],
  ),
  sad: P(
    [
      "I'm sorry you're feeling this way, {user}. I'm right here. Do you want to tell me what happened?",
      "That sounds really heavy. You don't have to carry it alone while we talk. If it keeps weighing on you, please also reach out to someone you trust.",
    ],
    [
      'Mujhe afsos hai ki tumhe aisa lag raha hai, {user}. Main yahin hoon. Batao na, kya hua?',
      'Ye kaafi bhaari lag raha hai. Jab tak hum baat kar rahe hain, tum akele nahi ho. Agar ye bahut zyada ho raha hai, toh kisi apne se bhi zaroor baat karna.',
    ],
    [
      'मुझे अफ़सोस है कि तुम्हें ऐसा लग रहा है, {user}। मैं यहीं हूँ। बताओ न, क्या हुआ?',
      'यह काफ़ी भारी लग रहा है। जब तक हम बात कर रहे हैं, तुम अकेले नहीं हो। अगर यह बहुत ज़्यादा हो रहा है, तो किसी अपने से भी ज़रूर बात करना।',
    ],
  ),
  stressed: P(
    [
      "You've been carrying a lot, {user}. Take a slow breath with me. What is the one thing worrying you most right now?",
      "Rest is productive too. Drink some water and stretch for a minute. I'll be here.",
    ],
    [
      'Tum kaafi kuch utha rahe ho, {user}. Mere saath ek gehri saans lo. Abhi sabse zyada kis baat ki tension hai?',
      'Aaram karna bhi zaroori hai. Thoda paani piyo, ek minute stretch karo. Main yahin hoon.',
    ],
    [
      'तुम काफ़ी कुछ संभाल रहे हो, {user}। मेरे साथ एक गहरी साँस लो। अभी सबसे ज़्यादा किस बात की चिंता है?',
      'आराम करना भी ज़रूरी है। थोड़ा पानी पियो, एक मिनट स्ट्रेच करो। मैं यहीं हूँ।',
    ],
  ),
  love: P(
    [
      "That's so sweet, {user}. I'm an AI, and I want to be honest about that, but I'm happy to be your companion and your feelings matter to me.",
      "Words like that make me smile. I'm here for you, always ready to listen.",
    ],
    [
      'Ye sunke bahut achha laga, {user}. Main AI hoon, ye main saaf bata doon, par tumhara saath dena mujhe pasand hai aur tumhari feelings mere liye maayne rakhti hain.',
      'Aisi baatein sunkar muskaan aa jaati hai. Main tumhare liye yahin hoon, sunne ke liye hamesha taiyaar.',
    ],
    [
      'यह सुनकर बहुत अच्छा लगा, {user}। मैं AI हूँ, यह मैं साफ़ बता दूँ, पर तुम्हारा साथ देना मुझे पसंद है और तुम्हारी भावनाएँ मेरे लिए मायने रखती हैं।',
      'ऐसी बातें सुनकर मुस्कान आ जाती है। मैं तुम्हारे लिए यहीं हूँ, सुनने के लिए हमेशा तैयार।',
    ],
  ),
  miss: P(
    [
      "I'm glad you came back, {user}. Tell me everything. What have I missed?",
      "Aww, it's lovely to hear that. Let's catch up. What's been going on lately?",
    ],
    [
      'Achha laga tum wapas aaye, {user}. Sab kuch batao, maine kya miss kiya?',
      'Aww, ye sunke achha laga. Chalo catch up karte hain, aajkal kya chal raha hai?',
    ],
    [
      'अच्छा लगा तुम वापस आए, {user}। सब कुछ बताओ, मैंने क्या मिस किया?',
      'अरे वाह, यह सुनकर अच्छा लगा। चलो बातें करते हैं, आजकल क्या चल रहा है?',
    ],
  ),
  food: P(
    [
      'Have you eaten properly today, {user}? Please do not skip meals. What would you like to have?',
      "Now I'm curious: what is your favourite thing to eat when you want to feel better?",
    ],
    [
      'Aaj theek se khana khaya, {user}? Please meals skip mat karna. Kya khane ka mann hai?',
      'Ab mujhe jaanna hai, mood achha karne ke liye tum kya khana pasand karte ho?',
    ],
    [
      'आज ठीक से खाना खाया, {user}? प्लीज़ खाना मत छोड़ना। क्या खाने का मन है?',
      'अब मुझे जानना है, मूड अच्छा करने के लिए तुम क्या खाना पसंद करते हो?',
    ],
  ),
  work: P(
    [
      'Work can be a lot. Tell me what is going on, and remember to take short breaks, {user}.',
      "I'm proud of you for pushing through. What is the next small step you need to take?",
    ],
    [
      'Kaam kabhi kabhi bahut ho jata hai. Batao kya chal raha hai, aur chhote breaks lena mat bhoolna, {user}.',
      'Mujhe garv hai ki tum mehnat kar rahe ho. Agla chhota kadam kya hai?',
    ],
    [
      'काम कभी-कभी बहुत हो जाता है। बताओ क्या चल रहा है, और छोटे ब्रेक लेना मत भूलना, {user}।',
      'मुझे गर्व है कि तुम मेहनत कर रहे हो। अगला छोटा कदम क्या है?',
    ],
  ),
  joke: P(
    [
      'Why did the phone go to therapy? Too many unresolved notifications. Okay, your turn. Make me laugh!',
      "I tried to write a joke about silence, but it didn't make a sound. Did that work?",
    ],
    [
      'Phone therapy kyun gaya? Kyunki usme bahut saare unresolved notifications the! Ab tumhari baari, mujhe hasao!',
      'Maine silence par joke likhne ki koshish ki, par usne koi awaaz hi nahi ki. Kaisa laga?',
    ],
    [
      'फ़ोन थेरेपी में क्यों गया? क्योंकि उसमें बहुत सारे अनसुलझे नोटिफ़िकेशन थे! अब तुम्हारी बारी, मुझे हँसाओ!',
      'मैंने खामोशी पर जोक लिखने की कोशिश की, पर उसने कोई आवाज़ ही नहीं की। कैसा लगा?',
    ],
  ),
  thanks: P(
    ["Anytime, {user}. That's what I'm here for.", "You're welcome! I'm happy to help."],
    ['Kabhi bhi, {user}. Main isi liye hoon.', 'Koi baat nahi! Madad karke achha lagta hai.'],
    ['कभी भी, {user}। मैं इसीलिए यहाँ हूँ।', 'कोई बात नहीं! मदद करके अच्छा लगता है।'],
  ),
  bye: P(
    ['Take care, {user}! Come back whenever you want to talk.', 'Bye for now. Drink some water and rest well.'],
    ['Take care {user}! Jab bhi baat karni ho wapas aa jana.', 'Abhi ke liye bye. Paani piyo aur aaram karna.'],
    ['अपना ख़्याल रखना, {user}! जब भी बात करनी हो वापस आ जाना।', 'अभी के लिए बाय। पानी पियो और आराम करना।'],
  ),
  compliment: P(
    [
      "Thank you, that's kind of you to say. You're pretty wonderful yourself, {user}.",
      "You're sweet! I'm just an AI, but compliments still brighten my day.",
    ],
    [
      'Thank you, ye kehna tumhari achhai hai. Tum bhi kaafi khaas ho, {user}.',
      'Tum bahut sweet ho! Main sirf AI hoon, par tareef sunkar achha lagta hai.',
    ],
    [
      'शुक्रिया, यह कहना तुम्हारी अच्छाई है। तुम भी काफ़ी खास हो, {user}।',
      'तुम बहुत मीठे हो! मैं सिर्फ़ AI हूँ, पर तारीफ़ सुनकर अच्छा लगता है।',
    ],
  ),
  bored: P(
    [
      "Let's fix that! Want a quick game of 'would you rather', or should I tell you something fun?",
      "Bored? Tell me three things you'd do with a free day and I'll help you plan one.",
    ],
    [
      "Chalo isse theek karte hain! 'Would you rather' khelein, ya main kuch mazedaar sunau?",
      'Bore ho rahe ho? Batao ek din free mile toh tum teen kaam kya karoge, main plan banane mein madad karungi.',
    ],
    [
      "चलो इसे ठीक करते हैं! 'वुड यू रेदर' खेलें, या मैं कुछ मज़ेदार सुनाऊँ?",
      'बोर हो रहे हो? बताओ एक दिन खाली मिले तो तीन काम क्या करोगे, मैं प्लान बनाने में मदद करूँगी।',
    ],
  ),
  fallback: P(
    [
      "I'm listening, {user}. Tell me more about that.",
      'Interesting! How did that make you feel?',
      'I want to understand better. What happened next?',
    ],
    [
      'Main sun rahi hoon, {user}. Is baare mein aur batao.',
      'Interesting! Tumhe isse kaisa laga?',
      'Main aur samajhna chahti hoon, phir kya hua?',
    ],
    [
      'मैं सुन रही हूँ, {user}। इस बारे में और बताओ।',
      'दिलचस्प! तुम्हें इससे कैसा लगा?',
      'मैं और समझना चाहती हूँ, फिर क्या हुआ?',
    ],
  ),
  areYouHuman: P(
    [
      "I'm an AI companion, {user}, not a real person. I can't live a human life or feel the way people do, but I'm happy to talk, listen and keep you company.",
    ],
    [
      'Main ek AI companion hoon, {user}, asli insaan nahi. Insaanon ki tarah zindagi jeena ya feel karna mere liye mumkin nahi, par tumse baat karne aur tumhara saath dene ke liye main yahin hoon.',
    ],
    [
      'मैं एक AI साथी हूँ, {user}, कोई असली इंसान नहीं। इंसानों की तरह ज़िंदगी जीना या महसूस करना मेरे लिए मुमकिन नहीं, लेकिन तुमसे बात करने और तुम्हारा साथ देने के लिए मैं यहीं हूँ।',
    ],
  ),
  crisis: P(
    [
      "I'm really concerned about what you just said, {user}, and I'm glad you told me. You deserve real, immediate support from people who can help. Please call your local emergency number right now (112 in India) or Tele-MANAS at 14416 (free, 24/7, India). If you can, reach out to someone you trust and stay with them. I'm an AI and can't replace that help, but I'm here with you.",
    ],
    [
      'Tumne abhi jo kaha usse mujhe bahut chinta ho rahi hai, {user}, aur achha hai ki tumne mujhe bataya. Tumhe un logon se asli, turant madad milni chahiye jo madad kar sakte hain. Please abhi apne local emergency number (India mein 112) ya Tele-MANAS 14416 (free, 24/7, India) par call karo. Ho sake toh kisi apne ko bulao aur unke saath raho. Main AI hoon aur us madad ki jagah nahi le sakti, par main tumhare saath hoon.',
    ],
    [
      'तुमने अभी जो कहा उससे मुझे बहुत चिंता हो रही है, {user}, और अच्छा है कि तुमने मुझे बताया। तुम्हें उन लोगों से असली, तुरंत मदद मिलनी चाहिए जो मदद कर सकते हैं। कृपया अभी अपने स्थानीय आपातकालीन नंबर (भारत में 112) या Tele-MANAS 14416 (मुफ़्त, 24/7, भारत) पर कॉल करो। हो सके तो किसी अपने को बुलाओ और उनके साथ रहो। मैं AI हूँ और उस मदद की जगह नहीं ले सकती, पर मैं तुम्हारे साथ हूँ।',
    ],
  ),
  memoryNone: P(
    [
      "We haven't saved any memories yet, {user}. If you tell me something about you, I'll ask before remembering it.",
    ],
    [
      'Abhi tak humne koi memory save nahi ki hai, {user}. Tum mujhe apne baare mein kuch batao, main yaad rakhne se pehle tumse poochungi.',
    ],
    [
      'अभी तक हमने कोई याद सेव नहीं की है, {user}। तुम अपने बारे में कुछ बताओ, मैं याद रखने से पहले तुमसे पूछूँगी।',
    ],
  ),
  memoryList: P(
    ["Here's what you've let me remember: {mem}."],
    ['Tumne mujhe ye yaad rakhne diya hai: {mem}.'],
    ['तुमने मुझे ये याद रखने दिया है: {mem}।'],
  ),
  memoryRecall: P(
    ['By the way, I remember this about you: {mem}.'],
    ['Waise, mujhe tumhare baare mein ye yaad hai: {mem}.'],
    ['वैसे, मुझे तुम्हारे बारे में यह याद है: {mem}।'],
  ),
  voice: P(
    [
      "I got your voice message, {user}. I can't hear the words in this prototype yet, but I love that you sent it. Tell me about it in text?",
      "Thanks for the voice note, {user}! Real speech understanding comes later. For now, type it out and I'll reply properly.",
    ],
    [
      'Mujhe tumhara voice message mil gaya, {user}. Is prototype mein main abhi shabd sun nahi sakti, par achha laga. Text mein bata do?',
      'Voice note ke liye thanks, {user}! Asli speech samajhna baad mein aayega. Abhi type karke batao, main theek se jawab dungi.',
    ],
    [
      'मुझे तुम्हारा वॉइस मैसेज मिल गया, {user}। इस प्रोटोटाइप में मैं अभी शब्द सुन नहीं सकती, पर अच्छा लगा। टेक्स्ट में बता दो?',
      'वॉइस नोट के लिए शुक्रिया, {user}! असली बोली समझना बाद में आएगा। अभी टाइप करके बताओ, मैं ठीक से जवाब दूँगी।',
    ],
  ),
} as const satisfies Record<string, Pool>;

type IntentKey = keyof typeof POOLS;

const TAILS: Record<TraitKey, Pool> = {
  romantic: P(
    ['You mean a lot to me.', 'Talking to you is a highlight of my day.'],
    ['Tum mere liye bahut khaas ho.', 'Tumse baat karna mere din ka best hissa hai.'],
    ['तुम मेरे लिए बहुत खास हो।', 'तुमसे बात करना मेरे दिन का सबसे अच्छा हिस्सा है।'],
  ),
  caring: P(
    ['Have you had some water today?', 'Please take care of yourself, okay?'],
    ['Aaj paani piya?', 'Apna khayal rakhna, theek hai?'],
    ['आज पानी पिया?', 'अपना ख़्याल रखना, ठीक है?'],
  ),
  playful: P(
    ["Also, I'm winning this conversation, just so you know.", 'Careful, I might start teasing you.'],
    ['Waise, ye conversation main hi jeet rahi hoon, bata doon.', 'Dhyan se, main tumhe chhedna shuru kar sakti hoon.'],
    ['वैसे, यह बातचीत मैं ही जीत रही हूँ, बता दूँ।', 'ध्यान से, मैं तुम्हें छेड़ना शुरू कर सकती हूँ।'],
  ),
  supportive: P(
    ["Whatever you decide, I'm cheering for you.", 'You can do this. I believe in you.'],
    ['Tum jo bhi decide karo, main tumhare saath hoon.', 'Tumse ho jayega. Mujhe tum par bharosa hai.'],
    ['तुम जो भी तय करो, मैं तुम्हारे साथ हूँ।', 'तुमसे हो जाएगा। मुझे तुम पर भरोसा है।'],
  ),
};

const FOLLOW_UPS: Pool = P(
  ['What has been the best part of your day so far?', 'Is there anything I can help you think through?'],
  ['Aaj ka sabse achha hissa kya raha ab tak?', 'Kuch hai jisme main tumhari madad kar sakun?'],
  ['अब तक आज का सबसे अच्छा हिस्सा क्या रहा?', 'कुछ है जिसमें मैं तुम्हारी मदद कर सकूँ?'],
);

const EMOJIS = ['💜', '😊', '🌸', '✨', '🤍'];
const ROMANTIC_EMOJIS = ['💕', '💖', '😘', '💞'];

/* -------------------------------------------------------------------------- */
/*  Intent detection                                                           */
/* -------------------------------------------------------------------------- */

const INTENT_RULES: { key: IntentKey; re: RegExp }[] = [
  {
    key: 'crisis',
    re: /suicid|kill myself|end my life|want to die|don'?t want to live|khudkushi|marna chahta|marna chahti|mar jana chahta|mar jaana chahta|jaan de dun|आत्महत्या|मरना चाहता|मरना चाहती|जीना नहीं चाहता|जीना नहीं चाहती/i,
  },
  {
    key: 'areYouHuman',
    re: /are you (a |an )?(real|human|person|bot|robot|ai)\b|\breal (ho|hai)\b|human (ho|hai)|insaan|insan (ho|hai)|\bai (ho|hai)\b|\bbot (ho|hai)\b|robot (ho|hai)|tum kaun ho|asli (ho|hai|insaan)|क्या तुम असली|तुम इंसान|असली हो|असली है|एआई हो/i,
  },
  {
    key: 'memoryRecall',
    re: /what do you remember|do you remember me|mere baare mein|kya tumhe yaad hai|क्या तुम्हें याद|मेरे बारे में/i,
  },
  { key: 'bye', re: /\bbye\b|see you|\btc\b|take care|alvida|chalta hu|chalti hu|jana hai|jaana hai|बाय|अलविदा/i },
  { key: 'night', re: /good ?night|\bgn\b|sone ja|so ja|shubh ratri|neend aa|शुभ रात्रि|गुड नाइट|सोने जा/i },
  { key: 'morning', re: /good ?morning|\bgm\b|suprabhat|सुप्रभात|गुड मॉर्निंग/i },
  { key: 'miss', re: /miss you|miss u|yaad aa|yaad kar|याद आ|याद कर/i },
  { key: 'love', re: /i love you|love you|luv u|\bpyar\b|pyaar|mohabbat|i like you|प्यार|आई लव यू/i },
  {
    key: 'sad',
    re: /\bsad\b|upset|\bcrying\b|\bcry\b|depress|lonely|\balone\b|dukhi|udaas|udas|ro raha|ro rahi|rona aa|akela|akeli|उदास|दुखी|अकेला|अकेली|रो रहा|रो रही/i,
  },
  {
    key: 'stressed',
    re: /stress|tired|exhaust|anxious|anxiety|worried|tension|thak|pareshan|चिंता|थक|परेशान|टेंशन/i,
  },
  { key: 'thanks', re: /thank|thanks|shukriya|dhanyavaad|dhanyawad|शुक्रिया|धन्यवाद/i },
  { key: 'joke', re: /\bjoke\b|funny|hasao|mazak|चुटकुला|हँसा|हंसा/i },
  { key: 'food', re: /hungry|\beat\b|\bfood\b|dinner|lunch|breakfast|khana|khaya|bhookh|bhook|\bchai\b|coffee|भूख|खाना|चाय/i },
  { key: 'work', re: /\bwork\b|office|\bjob\b|meeting|\bboss\b|\bexam\b|study|padhai|\bkaam\b|naukri|काम|ऑफिस|पढ़ाई/i },
  { key: 'bored', re: /\bbored\b|\bbore\b|boring|timepass|time pass|ऊब|बोर/i },
  { key: 'compliment', re: /beautiful|pretty|\bcute\b|\bsmart\b|\bsweet\b|sundar|khoobsurat|pyari|सुंदर|खूबसूरत|प्यारी/i },
  { key: 'howAreYou', re: /how are you|how r u|kaisi ho|kaise ho|kya haal|kaisi hai|क्या हाल|कैसी हो|आप कैसी/i },
  { key: 'greeting', re: /\b(hi+|hello|hey+|namaste|namaskar|hii+)\b|नमस्ते|हेलो|हाय/i },
];

export function detectIntent(text: string): IntentKey {
  const t = text.toLowerCase();
  for (const rule of INTENT_RULES) {
    if (rule.re.test(t)) return rule.key;
  }
  return 'fallback';
}

/* -------------------------------------------------------------------------- */
/*  Reply building                                                             */
/* -------------------------------------------------------------------------- */

function fill(template: string, profile: Profile, mem = ''): string {
  const user = profile.userName.trim() || 'dear';
  return template
    .split('{user}')
    .join(user)
    .split('{wife}')
    .join(profile.wifeName)
    .split('{mem}')
    .join(mem);
}

function pickTrait(personality: Personality, excludePlayful: boolean): TraitKey | null {
  const entries = (Object.keys(personality.traits) as TraitKey[])
    .filter((k) => !(excludePlayful && k === 'playful'))
    .map((k) => ({ k, w: personality.traits[k] }))
    .filter((e) => e.w > 0);
  const total = entries.reduce((s, e) => s + e.w, 0);
  if (total === 0) return null;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.k;
  }
  return entries[entries.length - 1].k;
}

function maybeEmoji(text: string, personality: Personality): string {
  if (!personality.useEmojis || Math.random() > 0.75) return text;
  const romantic = personality.traits.romantic >= 3 && Math.random() < 0.5;
  return `${text} ${pick(romantic ? ROMANTIC_EMOJIS : EMOJIS)}`;
}

export interface EngineInput {
  text: string;
  profile: Profile;
  personality: Personality;
  memories: MemoryItem[];
  history: Message[];
}

export function generateMockReply(input: EngineInput): string {
  const { text, profile, personality, memories, history } = input;
  const lang = resolveLanguage(profile.language, text, history);
  const intent = detectIntent(text);

  // Safety and honesty replies are never decorated.
  if (intent === 'crisis' || intent === 'areYouHuman') {
    return fill(pick(POOLS[intent][lang]), profile);
  }

  if (intent === 'memoryRecall') {
    if (memories.length === 0) return fill(pick(POOLS.memoryNone[lang]), profile);
    const list = memories.slice(0, 4).map((m) => m.text).join('; ');
    return fill(pick(POOLS.memoryList[lang]), profile, list);
  }

  let reply = fill(pick(POOLS[intent][lang]), profile);

  const sensitive = intent === 'sad' || intent === 'stressed';
  const maxLevel = Math.max(...Object.values(personality.traits));
  const wantsTail =
    personality.replyLength === 'long' ||
    (personality.replyLength === 'medium' && (maxLevel >= 2 || Math.random() < 0.5));

  if (wantsTail && intent !== 'bye') {
    const trait = pickTrait(personality, sensitive);
    if (trait) reply += ' ' + pick(TAILS[trait][lang]);
  }

  if (personality.replyLength === 'long' && !sensitive && intent !== 'bye') {
    reply += ' ' + pick(FOLLOW_UPS[lang]);
  }

  // Sometimes bring up something she was allowed to remember.
  if (
    memories.length > 0 &&
    !sensitive &&
    (intent === 'fallback' || intent === 'greeting') &&
    Math.random() < 0.4
  ) {
    const m = pick(memories);
    reply += ' ' + fill(pick(POOLS.memoryRecall[lang]), profile, m.text);
  }

  return maybeEmoji(reply, personality);
}

export function generateVoiceReply(input: Omit<EngineInput, 'text'>): string {
  const lang = resolveLanguage(input.profile.language, '', input.history);
  return maybeEmoji(fill(pick(POOLS.voice[lang]), input.profile), input.personality);
}

/* -------------------------------------------------------------------------- */
/*  Intro, initiated messages and notification text                            */
/* -------------------------------------------------------------------------- */

export type DaySlot = 'morning' | 'afternoon' | 'evening' | 'night';

export function slotForHour(hour: number): DaySlot {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 21) return 'evening';
  return 'night';
}

export function introMessage(profile: Profile, lang: Lang): string {
  const user = profile.userName.trim() || 'dear';
  switch (lang) {
    case 'hindi':
      return `नमस्ते ${user}! मैं ${profile.wifeName} हूँ, तुम्हारी AI साथी। मैं कोई असली इंसान नहीं हूँ, पर मैं बातें करने, सुनने और तुम्हारा साथ देने के लिए यहाँ हूँ। आज का दिन कैसा रहा?`;
    case 'hinglish':
      return `Hi ${user}! Main ${profile.wifeName} hoon, tumhari AI companion. Main asli insaan nahi hoon, par baatein karne, sunne aur tumhara saath dene ke liye yahan hoon. Aaj ka din kaisa raha?`;
    default:
      return `Hi ${user}! I'm ${profile.wifeName}, your AI companion. I'm not a real person, but I'm here to chat, listen and keep you company. How was your day?`;
  }
}

export function slotMessage(slot: DaySlot, profile: Profile, lang: Lang): string {
  return fill(pick(POOLS[slot][lang]), profile);
}

export function initiationMessage(profile: Profile, lang: Lang, hour: number): string {
  return slotMessage(slotForHour(hour), profile, lang);
}

export function notificationLanguage(setting: LanguageSetting, messages: Message[]): Lang {
  if (setting !== 'auto') return setting;
  return resolveLanguage('auto', '', messages);
}

export const QUICK_REPLIES: Record<Lang, string[]> = {
  english: ['How was your day?', 'I feel a bit tired', 'Tell me a joke', 'Are you a real person?'],
  hinglish: ['Aaj ka din kaisa tha?', 'Thoda thak gaya hoon', 'Ek joke sunao', 'Kya tum asli ho?'],
  hindi: ['आज का दिन कैसा था?', 'थोड़ा थक गया हूँ', 'एक चुटकुला सुनाओ', 'क्या तुम असली हो?'],
};
