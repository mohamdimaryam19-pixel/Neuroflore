# Ce qui nous relie ne fane pas

## Contenu du dossier

```
projet/
├── dessin.jpg              ta photo d'origine
├── detourage.py            étape 1 : nettoie la photo → site/dessin.png
├── chemins.py              étape 2 : calcule les chemins des impulsions → site/reseau.js
├── separer_fleurs.py       étape 3 : découpe chaque tête de fleur → site/tete_*.png, site/tetes.js
├── tetes_verification.png  contrôle visuel du découpage (une couleur par tête)
├── verification.png        contrôle visuel du détourage
├── chemins_verification.png contrôle visuel des chemins
└── site/                   l'œuvre (c'est ce dossier qu'on présente)
    ├── index.html
    ├── style.css
    ├── script.js           le système génératif
    ├── reseau.js           les chemins (généré)
    ├── tetes.js            position des têtes et de leur pivot (généré)
    ├── dessin_base.png     le bouquet sans les têtes (généré)
    ├── tete_*.png          une image par tête de fleur (généré)
    ├── dessin.png          le dessin détouré complet (généré)
    └── dessin_inverse.png  version de secours, traits clairs sur noir
```

## Voir l'œuvre

Double-clique sur `site/index.html`. Pas de serveur nécessaire : les chemins sont
dans un fichier `.js` (et non `.json`) justement pour que la page fonctionne en
ouvrant le fichier directement.

Le bouton rond en haut à droite bascule entre le thème clair (fond blanc, par
défaut) et le thème sombre : la lune passe en sombre, le soleil revient en clair.
Le choix est mémorisé par le navigateur.

Raccourcis clavier :

| Touche | Effet |
|---|---|
| Espace | couper / rétablir les connexions |
| R | nouvelle graine : un autre déroulé du même système |
| T | afficher le réseau ; un clic donne les coordonnées (copiées) |
| C | afficher / masquer le compteur (la croix le masque aussi) |
| H | afficher l'aide et la graine en cours |

Pour rejouer exactement le même déroulé : `index.html?graine=42`.

## Refaire le traitement (si tu changes de photo)

```
pip install opencv-python numpy matplotlib pillow scikit-image
python detourage.py
python chemins.py
python separer_fleurs.py
```

1. Dans `detourage.py`, ajuste `RECADRAGE` (zone du bouquet) et `ZONES_A_EFFACER`
   (autres dessins sur la feuille). Si des traits disparaissent, baisse `SEUIL` ;
   s'il reste des taches, monte `SEUIL` ou `AIRE_MIN`.
2. Ouvre `verification.png` pour contrôler.
3. Dans `chemins.py`, place `BASE`, les centres des fleurs et les bouts de
   ramifications (touche T dans la page + clic pour lire les coordonnées).
   Le script trouve seul le trajet qui suit tes traits.
4. Ouvre `chemins_verification.png` : les tiges en jaune, les ramifications en rouge.
5. `separer_fleurs.py` coupe chaque tige juste sous sa fleur, puis récupère tout
   le trait relié au cœur de la fleur (comme le pot de peinture d'un logiciel de
   dessin). Ouvre `tetes_verification.png` : chaque tête doit avoir sa couleur.

## Régler l'esthétique

Tout est en haut de `site/script.js`, dans `PARAMS` :

- `opaciteDessin` : présence du trait quand tout est fané (une valeur par thème)
- `demiVieMin` / `demiVieMax` : vitesse à laquelle les fleurs fanent
- `intervalleMoyen` : fréquence des impulsions
- `vitesseMin` / `vitesseMax` : vitesse des impulsions
- `gainArrivee` : force avec laquelle une impulsion ravive une fleur
- `fanage` : de combien une tête tombe quand elle fane (grande fleur / petit
  bouton), la force et le rebond avec lesquels elle se redresse, la vitesse à
  laquelle la couleur revient, le léger balancement d'une fleur vivante
- `naissances` : nombre maximum de fleurs nées, rythme des naissances, énergie
  du bouquet nécessaire, durée de pousse de la tige et d'éclosion, tailles du
  bouton et du neurone adulte, et vitesse à laquelle le bouton grandit
  (`croissanceParImpulsion`, `croissanceLente`)
- `etincelles` : nombre, vitesse et durée des étincelles
- `rameaux` : nombre, longueur et taille du bourgeon des rameaux
- `memoire` : durée, intensité et largeur de la traînée colorée
- `ambiance` : force du halo coloré derrière le bouquet, par thème
- `trait` : la couleur du crayon dans chaque thème
- `palette` : les couleurs des fleurs (une par fleur, dans l'ordre de `reseau.js`). En fanant, une fleur perd sa couleur et redevient un trait gris.

## Solutions de secours

- **Le détourage rate** : dans `script.js`, remplace `dessin.src = "dessin.png"`
  par `"dessin_inverse.png"` et ajoute `canvas { mix-blend-mode: screen; }` dans
  `style.css`. Le noir de l'image se fond dans le fond.
- **`chemins.py` ne s'installe pas** (scikit-image) : le `reseau.js` fourni marche
  déjà avec ce dessin. Pour un nouveau dessin, on peut écrire les points à la main
  dans `reseau.js`, en lignes droites entre quelques points cliqués.
- **Pas de Python du tout le jour J** : le dossier `site/` est autonome.

## Les règles du système

- **Fixe** : le dessin et le tracé du réseau.
- **Évolue** : l'énergie de chaque fleur, les impulsions en circulation.
- **Décidé par l'algorithme** (hasard contrôlé par une graine) : le moment des
  émissions, la fleur visée, la vitesse, l'intensité, la diffusion.

1. Laissée seule, chaque fleur perd la moitié de son éclat en 4 à 9 secondes.
2. Le pied du bouquet émet des impulsions à intervalles irréguliers, avec une
   lente respiration.
3. Une impulsion vise plutôt une fleur affaiblie, sans certitude.
4. À l'arrivée, la fleur est ravivée ; l'élan se diffuse dans ses ramifications,
   d'autant plus que la fleur est vivante.
5. Connexions coupées : plus rien n'arrive, tout s'éteint jusqu'à la trace du crayon.
6. L'énergie se voit. Une fleur affaiblie fane : elle perd sa couleur, sa tête
   s'incline et tombe doucement sur sa tige, et elle perd quelques pétales.
   Quand une impulsion arrive, elle renaît : la couleur revient et sa tête se
   redresse avec un petit rebond, comme une tige qui reprend de la force.
   À l'arrivée de la lumière, des étincelles jaillissent autour de la fleur.
7. Quand le bouquet est bien nourri, de nouvelles fleurs naissent. Une tige
   pousse depuis une tige existante, vers un espace vide, puis un petit bouton
   éclot au bout, porté par une impulsion. Chaque impulsion qu'il reçoit le fait
   grandir : petit à petit, le bouton se transforme en neurone, comme les grandes
   fleurs du haut. Les têtes sont reprises du dessin, tournées dans le sens de
   leur nouvelle tige. Une fois nées, elles vivent, fanent et renaissent comme
   les autres. Jusqu'à 22 fleurs peuvent naître (environ 2 minutes pour un
   bouquet garni) ; certains boutons deviennent des neurones, d'autres de grandes
   fleurs. Plus le bouquet a de fleurs, plus il envoie d'impulsions, pour que
   chacune reste nourrie. Leurs tiges se ramifient en rameaux terminés par un bourgeon, et
   de nouvelles fleurs peuvent naître sur les fleurs nées : le réseau grandit.
8. Mémoire : chaque impulsion laisse sur la tige une traînée de sa couleur, qui
   s'efface lentement. Plus un chemin est emprunté, plus il reste coloré. Un
   halo d'ambiance, de la couleur moyenne des fleurs vivantes, respire derrière
   le bouquet.

Le compteur en bas à droite indique combien de fleurs sont en vie.

## Texte pour l'oral (environ 1 min 30)

> J'ai dessiné au crayon un bouquet dont les fleurs sont des neurones. Le
> rapprochement n'est pas forcé : en neurosciences, on parle déjà
> d'« arborisation dendritique ». Les fleurs disent la fragilité du vivant ; les
> tiges qui les relient disent la transmission, la mémoire, les liens.
>
> Le dessin est photographié, puis nettoyé avec Python. Je n'ai pas redessiné
> mes traits : un algorithme trouve lui-même les chemins qui suivent mon crayon.
> C'est ce qui me rapproche de Vera Molnár et de ses *Lettres de ma mère* : une
> trace de la main, prise en charge par des règles.
>
> Le système en a six. Chaque fleur fane seule : sa tête tombe, elle perd sa couleur et ses pétales. Le pied du bouquet envoie des
> impulsions de lumière, à des moments imprévisibles. Elles vont plutôt vers les
> fleurs les plus faibles. En arrivant, elles les ravivent et se diffusent dans
> leurs ramifications, et la fleur se redresse. Si je coupe les connexions — [appuyer sur Espace] — plus
> rien n'arrive, et tout s'éteint jusqu'à ne laisser que le dessin.
>
> Avec la *Bone Chair* de Joris Laarman (2006), l'algorithme crée la forme. Ici,
> c'est l'inverse : la forme reste humaine, et l'algorithme gouverne le temps et
> la lumière. Chaque graine donne un autre déroulé, que je ne peux pas prévoir,
> sans jamais redessiner l'œuvre.
>
> Ce qui nous relie ne fane pas : ce n'est pas une vérité biologique, c'est la
> règle que j'ai choisi d'écrire.
