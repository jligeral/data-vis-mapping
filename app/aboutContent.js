export const aboutContent = `
<h1><em>Visualization</em> Visualization</h1>
<br/>
<h2>About Us</h2>
  <div style=\"display: flex; justify-content: space-around;\">
    <div>
      <h4>James Ligeralde</h4>
      <p>M.S. Computer Science</p>
    </div>
    <div>
      <h4>Igor Rodin</h4>
      <p>M.S. Computer Science</p>
    </div>
    <div>
      <h4>Tevin Takata</h4>
      <p>M.S. Computer Science</p>
    </div>
  </div>
  <br/>
  <h2>FAQ</h2>
  <h4><strong>What is this data about?</strong></h4>
  <p style="text-align: justify; text-justify: inter-word;">This is an interactive map of academic research in the field of information visualization. It allows you to explore about 45,000 papers from major conferences (like IEEE VIS, CHI, EuroVis) by the semantic similarity of their ideas as revealed through their titles and abstracts.</p>
  <p style="text-align: justify; text-justify: inter-word;">This project is inspired by Friso van Dijk, Marco Spruit, Chaïm van Toledo, and Matthieu Brinkhuis and their paper:</p>
  <p style="text-align: justify; text-justify: inter-word;"><a href="https://www.frisovandijk.com/research/pillars-of-privacy.pdf" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: inherit;">"Pillars of Privacy: Identifying Core Theory in a Network Analysis of Privacy Literature" (2021)</a></p>
  <br/>

  <h4><strong>How is the data processed?</strong></h4>
  <p style="text-align: justify; text-justify: inter-word;">Data was collected from OpenAlex on November 17, 2025. OpenAlex catalogs scientific papers and their information such as their title, year published, authors, and so on. Data was cleaned by removing unnecessary columns and renaming required columns.</p>
  <br/>

  <h4><strong>How are the texts converted for analysis?</strong></h4>
  <p style="text-align: justify; text-justify: inter-word;">Embeddings are created using TF-IDF (Term Frequency-Inverse Document Frequency) using the abstracts of each paper. If a paper does not have an abstract, the title is used instead. Since the vectors contain numerous dimensions, we use UMAP (Uniform Manifold Approximation and Projection) to reduce the data into a 3D space, preserving the semantic relationships between papers</p>
  <br/>

  <h4><strong>How are clusters generated?</strong></h4>
  <p style="text-align: justify; text-justify: inter-word;">Clusters are generated using HDBSCAN (Hierarchical Density-Based Spatial Clustering of Applications with Noise), which groups similar papers together based on their proximity in the reduced 3D space. Each cluster represents a group of papers that share similar themes or topics.</p>
  <br/>

  <h4><strong>What is the -1 cluster?</strong></h4>
  <p style="text-align: justify; text-justify: inter-word;">The -1 cluster represents noise or outliers in the data that do not fit well into any of the identified clusters. These papers may cover unique topics or have less common themes compared to the main clusters.</p>
  <br/>

  <h4><strong>How do I navigate the visualization?</strong></h4>
  <p style="text-align: justify; text-justify: inter-word;">You can click on any sphere to see details about a paper and other papers in its cluster. You can rotate the view by clicking and dragging your mouse. Use the scroll wheel to zoom in and out. Dragging allows you to explore different parts of the galaxy. The slider at the bottom lets you animate the visualization over publication years, helping you see how research trends evolve over time.</p>
`;
