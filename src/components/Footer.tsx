import { motion } from "framer-motion";
import { Github, Twitter, Linkedin } from "lucide-react";

const SOCIAL_LINKS = [
  {
    icon: Github,
    href: "https://github.com/harshitkumars452004",
    label: "GitHub",
  },
  {
    icon: Linkedin,
    href: "https://www.linkedin.com/in/harshitkumars452004/",
    label: "LinkedIn",
  },
  {
    icon: Twitter,
    href: "https://twitter.com/harshitkumars452004",
    label: "Twitter",
  },
];

const Footer = () => {
  return (
    <footer className="relative py-16 overflow-hidden">
      {/* Separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="flex flex-col items-center text-center">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2.5 mb-2 justify-center">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm text-white"
                style={{ background: "var(--gradient-brand)" }}
              >
                O
              </div>
              <span className="font-display font-bold text-lg text-white">
                OverWatch AI
              </span>
            </div>
            <p className="text-white/30 text-sm">
              Credit Decision Trust Intelligence
            </p>
          </motion.div>

          {/* Socials */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex gap-3 mb-8"
          >
            {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="p-2.5 rounded-lg transition-all duration-200 text-white/25 hover:text-white/60"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </motion.div>

          {/* Copyright */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-white/20 text-xs"
          >
            <p>
              © {new Date().getFullYear()} OverWatch AI. Built for responsible
              lending and AI governance.
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
