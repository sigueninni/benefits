# TODO List - HR Benefits Requests

## ✅ Completed Tasks
- ~~Gérer UI avec un modèle JSON local~~
- ~~Initialisation automatique des données de l'école à la sélection~~
- ~~Vérifier qu'on met à jour subty du 0965~~
- ~~Rendre begda/endda obligatoire dans la popup de choix du type~~
- ~~Initialiser tous les champs automatiquement d'EG comme dans l'infotype~~
- ~~Save~~
- ~~Ajout zones spécifiques EG uniquement storage coté Fiori~~
- ~~Ajouter les champs du form EG 'to be stored only on Fiori'~~
- ~~Ajouter les descriptions des zones avec clé( comme natio fasex etc...)~~
- ~~dynamic display of child boarderer~~
- ~~Submit~~
- ~~Mettre à jour la table history en parallèle de la table header -> Nicolas a aussi une méthode...~~
- ~~Écran Claim/Advance~~
- ~~Filtres des Fragments Choice : currency et country~~
- ~~Timeline sans features~~
- ~~refactorer la visibilityUI~~
- ~~Visibilité des bouttons, floatBar~~
- ~~Changer les valeurs de Text2 et créer le domaine coté SAP~~
- ~~Regarder les problémes du save sur les zones côté ABAP~~
- ~~Vérifications : begda < endda et type de requête obligatoire~~
- ~~Enlever setTimeout~~  

## 📋 Ongoing Tasks
- Claim/Advance Odata sap
- Eligibility for Boarding	EGC01	ToDo	Logic to be extracted from the infotype --> not even used and depend on country of school on code but not executed?


## ⏳ Pending Tasks
- Gestion de l'éligibilité
- Completer les fonction de tri/search de la Timeline
- revoir la 'completeness'  
- Factoriser dans des méthodes du 'Save'
- Vérifier les switchs côté front et mettre booleans côté OData & problème des switchs qui se mettent à true après UI SETTINGS
- Ajouter les valeurs suggérées sur les Select avec beaucoup de données
- Gestion des pièces jointes
- Attention : le facteur de proration se recalcule si on change egyto... regarder le PAI pour d'autres champs et ajuster au Save (plus simple sinon au changement de date)
- Nettoyer l'écran quand pas de requête
- Améliorer le filtre master pour le case sensitive
- Tri
- i18n
- Gérer les dates de rétroactivité possibles, création de requête dans le passé etc...
- Exceptions côté backend à gérer côté frontend
- Corriger les Value Help des eligibility et dependency
